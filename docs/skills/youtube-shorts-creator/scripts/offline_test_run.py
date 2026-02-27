#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
from pathlib import Path

BASE_OUTPUT = Path('D:/Projects/AGI/atlas/output/shorts')
SKILL_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = SKILL_DIR / 'assets'
SAMPLE_JSON = ASSETS_DIR / 'sample_channel_dump.json'
REPORT_TEMPLATE = ASSETS_DIR / 'channel-report-template.md'
SCRIPT_TEMPLATE = ASSETS_DIR / 'shorts-script-template.md'
VEO_TEMPLATE = ASSETS_DIR / 'veo-prompt-template.txt'

STOPWORDS = {
    'the','and','for','with','this','that','from','into','your','you','how','why','what','when','where','about',
    'a','an','of','to','in','on','at','is','are','be','as','by','or','it','its','our','we','us','their','they',
    'seconds','second','shorts','short','tips','fast','quick'
}


def slugify(value):
    value = value.lower()
    value = re.sub(r'[^a-z0-9]+', '-', value)
    return value.strip('-') or 'channel'


def parse_duration(duration):
    match = re.match(r'PT(?:(\d+)M)?(?:(\d+)S)?', duration or '')
    if not match:
        return 0
    minutes = int(match.group(1) or 0)
    seconds = int(match.group(2) or 0)
    return minutes * 60 + seconds


def extract_keywords(text):
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9']+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def top_keywords(videos, channel_desc, limit=6):
    counts = {}
    for video in videos:
        title = video.get('title', '')
        desc = video.get('description', '')
        tags = ' '.join(video.get('tags', []) or [])
        for word in extract_keywords(f"{title} {desc} {tags}"):
            counts[word] = counts.get(word, 0) + 1
    for word in extract_keywords(channel_desc or ''):
        counts[word] = counts.get(word, 0) + 2
    return [w for w, _ in sorted(counts.items(), key=lambda x: (-x[1], x[0]))[:limit]]


def fill_template(template_path, mapping):
    content = template_path.read_text(encoding='utf-8')
    for key, value in mapping.items():
        content = content.replace(f"{{{{{key}}}}}", value)
    return content


def main():
    parser = argparse.ArgumentParser(description='Offline workflow test for YouTube Shorts Creator')
    parser.add_argument('--input', default=str(SAMPLE_JSON))
    parser.add_argument('--out', default=None)
    parser.add_argument('--shorts', type=int, default=5)
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f'Input not found: {input_path}')

    data = json.loads(input_path.read_text(encoding='utf-8'))
    channel = data.get('channel', {})
    videos = data.get('videos', [])

    channel_title = channel.get('title') or 'Channel'
    channel_slug = slugify(channel_title)
    timestamp = time.strftime('%Y-%m-%d_%H-%M-%S')
    run_dir = Path(args.out) if args.out else BASE_OUTPUT / channel_slug / timestamp

    analysis_dir = run_dir / 'analysis'
    metadata_dir = run_dir / 'metadata'
    scripts_dir = run_dir / 'scripts'
    prompts_dir = run_dir / 'prompts'
    voice_dir = run_dir / 'voice'
    manifest_dir = run_dir / 'manifests'

    for d in [analysis_dir, metadata_dir, scripts_dir, prompts_dir, voice_dir, manifest_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Copy metadata
    (metadata_dir / 'channel_dump.json').write_text(json.dumps(data, indent=2), encoding='utf-8')

    keywords = top_keywords(videos, channel.get('description', ''))
    primary_kw = keywords[0] if keywords else 'automation'

    durations = [parse_duration(v.get('duration')) for v in videos]
    avg_duration = sum(durations) / len(durations) if durations else 45
    pacing = 'fast-paced' if avg_duration <= 60 else 'mid-paced'

    themes = '\n'.join([f"- {kw}" for kw in keywords]) if keywords else '- general technology'
    evidence_titles = '\n'.join([f"- {v.get('title','')[:80]}" for v in videos[:5]])

    report_content = fill_template(REPORT_TEMPLATE, {
        'CHANNEL_TITLE': channel_title,
        'CHANNEL_ID': channel.get('id', ''),
        'CHANNEL_HANDLE': channel.get('customUrl', ''),
        'TIMESTAMP': timestamp,
        'NICHE_SUMMARY': f"Short-form {primary_kw} education for developers and tech builders.",
        'STYLE_SUMMARY': f"{pacing} explainers with tactical tips and quick demos.",
        'THEMES_LIST': themes,
        'AUDIENCE_PROFILE': "Developers, technical founders, and automation-minded teams.",
        'FORMATS_LIST': "- 45-60s Shorts\n- Hook-first explainer\n- Checklist or step-by-step walkthrough",
        'EVIDENCE_SUMMARY': evidence_titles,
        'SHORTS_STRATEGY': "Prioritize strong hooks, rapid value delivery, and a clear CTA to subscribe or comment."
    })

    (analysis_dir / 'channel_profile.md').write_text(report_content, encoding='utf-8')

    shorts_count = max(1, args.shorts)
    shorts_manifest = []

    for i in range(1, shorts_count + 1):
        short_id = f"short_{i:03d}"
        angle = keywords[(i - 1) % len(keywords)] if keywords else 'automation'
        hook = f"{angle.title()} in 60 seconds: the one trick you should steal"
        script_body = (
            f"Here is a rapid breakdown of {angle} you can use today. "
            f"First, identify the core step that saves the most time. "
            f"Second, automate it with a repeatable template or script. "
            f"Third, verify the output with a quick sanity check. "
            f"Finally, document the workflow so your team can reuse it."
        )
        onscreen = "- Hook\n- 3-step breakdown\n- Quick win\n- CTA"
        cta = "Follow Atlas for more developer workflow boosts."

        script_content = fill_template(SCRIPT_TEMPLATE, {
            'SHORT_ID': short_id,
            'TITLE': f"{angle.title()} workflow boost",
            'HOOK': hook,
            'SCRIPT_BODY': script_body,
            'ONSCREEN_TEXT': onscreen,
            'CTA': cta
        })

        script_path = scripts_dir / f"{short_id}.md"
        script_path.write_text(script_content, encoding='utf-8')

        prompt_paragraph = (
            f"Vertical 9:16 short showing a focused developer workstation scene where {angle} is explained with crisp motion graphics, "
            f"fast jump cuts, and subtle neon lighting. The camera starts with a tight close-up on a laptop screen, then pans to a whiteboard "
            f"as the three-step workflow appears as kinetic text overlays. The mood is energetic and precise, with clean UI highlights, soft blue "
            f"rim lighting, and quick cuts matching the narration pacing. End on a bold CTA overlay to follow for more workflow boosts. "
            f"Aspect ratio 9:16, duration 60 seconds."
        )

        prompt_content = fill_template(VEO_TEMPLATE, {
            'PROMPT_PARAGRAPH': prompt_paragraph
        })

        prompt_path = prompts_dir / f"{short_id}_veo.txt"
        prompt_path.write_text(prompt_content, encoding='utf-8')

        voice_short_dir = voice_dir / short_id
        voice_short_dir.mkdir(parents=True, exist_ok=True)
        voice_text_path = voice_short_dir / 'voice_source.txt'
        voice_text_path.write_text(script_body + "\n" + cta, encoding='utf-8')

        # Chunk text into 120-160 words (dry run, text only)
        words = (script_body + " " + cta).split()
        chunks = []
        chunk_size = 140
        for idx in range(0, len(words), chunk_size):
            chunks.append(' '.join(words[idx:idx + chunk_size]))

        chunk_paths = []
        for idx, chunk in enumerate(chunks, start=1):
            chunk_path = voice_short_dir / f"voice_part_{idx:02d}.txt"
            chunk_path.write_text(chunk + "\n", encoding='utf-8')
            chunk_paths.append(str(chunk_path))

        shorts_manifest.append({
            'id': short_id,
            'title': f"{angle.title()} workflow boost",
            'script_path': str(script_path),
            'prompt_path': str(prompt_path),
            'voice_chunks': chunk_paths,
            'audio_generated': False
        })

    manifest = {
        'channel': {
            'title': channel_title,
            'id': channel.get('id', ''),
            'handle': channel.get('customUrl', '')
        },
        'timestamp': timestamp,
        'shorts_count': shorts_count,
        'shorts': shorts_manifest,
        'voice_settings': {
            'chunk_words': 120,
            'voice_id': 'voice-107',
            'api': 'voice-tool'
        },
        'status': 'dry_run',
        'performance_notes': "",
        'iterations': [],
        'publish_schedule': []
    }

    (manifest_dir / 'run_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(str(run_dir))


if __name__ == '__main__':
    main()
