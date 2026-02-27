#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

API_BASE = 'https://www.googleapis.com/youtube/v3'


def api_get(endpoint, params, api_key):
    params = {k: v for k, v in params.items() if v is not None}
    params['key'] = api_key
    url = f"{API_BASE}/{endpoint}?{urlencode(params)}"
    req = Request(url, headers={'User-Agent': 'atlas-shorts-skill/1.0'})
    with urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))


def parse_channel_input(value):
    value = value.strip()
    if value.startswith('UC') and len(value) >= 20:
        return {'id': value}
    if value.startswith('@'):
        return {'handle': value.lstrip('@')}

    if 'youtube.com' in value:
        parsed = urlparse(value)
        path = parsed.path.strip('/')
        if not path:
            return {}
        if path.startswith('@'):
            return {'handle': path.lstrip('@')}
        parts = path.split('/')
        if parts[0] == 'channel' and len(parts) > 1:
            return {'id': parts[1]}
        if parts[0] == 'user' and len(parts) > 1:
            return {'username': parts[1]}
        if parts[0] == 'c' and len(parts) > 1:
            return {'custom': parts[1]}
    return {'query': value}


def resolve_channel(api_key, channel_input):
    info = parse_channel_input(channel_input)
    if 'id' in info:
        data = api_get('channels', {
            'part': 'snippet,contentDetails,statistics,brandingSettings,topicDetails',
            'id': info['id']
        }, api_key)
        return data.get('items', [])

    if 'handle' in info:
        data = api_get('channels', {
            'part': 'snippet,contentDetails,statistics,brandingSettings,topicDetails',
            'forHandle': info['handle']
        }, api_key)
        return data.get('items', [])

    if 'username' in info:
        data = api_get('channels', {
            'part': 'snippet,contentDetails,statistics,brandingSettings,topicDetails',
            'forUsername': info['username']
        }, api_key)
        return data.get('items', [])

    if 'custom' in info or 'query' in info:
        query = info.get('custom') or info.get('query')
        search = api_get('search', {
            'part': 'snippet',
            'type': 'channel',
            'q': query,
            'maxResults': 5
        }, api_key)
        items = search.get('items', [])
        if not items:
            return []
        channel_ids = [item['snippet']['channelId'] for item in items]
        data = api_get('channels', {
            'part': 'snippet,contentDetails,statistics,brandingSettings,topicDetails',
            'id': ','.join(channel_ids)
        }, api_key)
        return data.get('items', [])

    return []


def extract_channel(channel):
    snippet = channel.get('snippet', {})
    stats = channel.get('statistics', {})
    branding = channel.get('brandingSettings', {})
    topic = channel.get('topicDetails', {})
    return {
        'id': channel.get('id'),
        'title': snippet.get('title'),
        'description': snippet.get('description'),
        'customUrl': snippet.get('customUrl'),
        'publishedAt': snippet.get('publishedAt'),
        'country': snippet.get('country'),
        'thumbnails': snippet.get('thumbnails'),
        'keywords': branding.get('channel', {}).get('keywords'),
        'statistics': stats,
        'topicDetails': topic,
        'uploadsPlaylist': channel.get('contentDetails', {}).get('relatedPlaylists', {}).get('uploads')
    }


def fetch_upload_video_ids(api_key, playlist_id, max_videos=None):
    video_ids = []
    page_token = None
    while True:
        data = api_get('playlistItems', {
            'part': 'snippet,contentDetails',
            'playlistId': playlist_id,
            'maxResults': 50,
            'pageToken': page_token
        }, api_key)
        for item in data.get('items', []):
            vid = item.get('contentDetails', {}).get('videoId')
            if vid:
                video_ids.append(vid)
                if max_videos and len(video_ids) >= max_videos:
                    return video_ids
        page_token = data.get('nextPageToken')
        if not page_token:
            break
    return video_ids


def fetch_video_details(api_key, video_ids):
    videos = []
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]
        data = api_get('videos', {
            'part': 'snippet,contentDetails,statistics,topicDetails',
            'id': ','.join(chunk)
        }, api_key)
        for item in data.get('items', []):
            snippet = item.get('snippet', {})
            stats = item.get('statistics', {})
            content = item.get('contentDetails', {})
            topic = item.get('topicDetails', {})
            videos.append({
                'id': item.get('id'),
                'title': snippet.get('title'),
                'description': snippet.get('description'),
                'publishedAt': snippet.get('publishedAt'),
                'tags': snippet.get('tags', []),
                'categoryId': snippet.get('categoryId'),
                'duration': content.get('duration'),
                'viewCount': stats.get('viewCount'),
                'likeCount': stats.get('likeCount'),
                'commentCount': stats.get('commentCount'),
                'thumbnails': snippet.get('thumbnails'),
                'channelId': snippet.get('channelId'),
                'channelTitle': snippet.get('channelTitle'),
                'topicDetails': topic
            })
    return videos


def main():
    parser = argparse.ArgumentParser(description='Fetch YouTube channel metadata + videos')
    parser.add_argument('channel', help='Channel ID, handle, or URL')
    parser.add_argument('--api-key', dest='api_key', default=os.getenv('YOUTUBE_API_KEY'))
    parser.add_argument('--max', dest='max_videos', type=int, default=None)
    parser.add_argument('--out', dest='out_path', default=None)
    parser.add_argument('--pretty', action='store_true')
    args = parser.parse_args()

    if not args.api_key:
        print('ERROR: Provide --api-key or set YOUTUBE_API_KEY', file=sys.stderr)
        sys.exit(2)

    channels = resolve_channel(args.api_key, args.channel)
    if not channels:
        print('ERROR: No channel found', file=sys.stderr)
        sys.exit(3)

    channel = channels[0]
    channel_data = extract_channel(channel)
    uploads = channel_data.get('uploadsPlaylist')
    if not uploads:
        print('ERROR: uploads playlist not found', file=sys.stderr)
        sys.exit(4)

    video_ids = fetch_upload_video_ids(args.api_key, uploads, args.max_videos)
    videos = fetch_video_details(args.api_key, video_ids)

    output = {
        'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'channel': channel_data,
        'video_count': len(videos),
        'videos': videos
    }

    if args.out_path:
        os.makedirs(os.path.dirname(args.out_path), exist_ok=True)
        with open(args.out_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2 if args.pretty else None)

    print(json.dumps(output, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == '__main__':
    main()
