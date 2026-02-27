---
name: youtube-shorts-creator
description: "Create a YouTube Shorts Creator workflow that analyzes a YouTube channel (titles, descriptions, metadata) and produces a channel capability report plus a full Shorts pipeline: scripts, Veo-ready prompts, and chunked voice-over audio. Use when asked to build or run a Shorts automation system, analyze a channel for Shorts content, generate Shorts scripts/prompts/voice, or create an end-to-end Shorts pipeline."
---

# YouTube Shorts Creator

## Overview
Build a repeatable Shorts pipeline: fetch channel metadata, synthesize a capability report, then generate scripts, Veo-ready prompts, and chunked voice audio with organized local outputs.

## Required Inputs
- YouTube channel identifier (URL, handle, or channel ID).
- YouTube Data API key from `YOUTUBE_API_KEY` or saved config (ask only if missing).
- Number of Shorts to generate (default to 5 if user does not specify).

## Auto-Discovery Rule (No Questionnaires)
Do not ask about previous viral videos, vibe, or manual questionnaires when a channel is provided.
Infer niche, style, themes, and audience from channel metadata automatically.
Only ask for a channel identifier if none was provided.

## Output Structure (Mandatory)
Use the canonical layout in `references/output-schema.md`.
All outputs must be saved locally under a timestamped folder.

## Workflow (End-to-End)

### Step 1: Fetch Channel + Video Metadata
Use the script:

```
python scripts/youtube_channel_dump.py "<channel_url_or_handle>" --out "<run_dir>/metadata/channel_dump.json" --pretty
```

- This must include **all** video titles, descriptions, durations, tags, and available stats.
- If the user provides a handle, prefer `@handle` or `youtube.com/@handle`.

### Step 2: Generate Channel Capability Report
Create `analysis/channel_profile.md` using `assets/channel-report-template.md`.
The report must clearly define:
- **Niche** (exact domain + positioning)
- **Content Style** (tone, pacing, production style)
- **Recurring Themes** (topic clusters)
- **Audience Type** (persona, age range, motivation)
- **Video Formats** (formats, length, hooks, CTA patterns)

Use channel description + video titles + tags + most-viewed topics as evidence.
Do not pause for additional user input once channel data is available.

### Step 3: Generate Shorts Scripts
Create `scripts/short_001.md` etc. using `assets/shorts-script-template.md`.
Each script must be:
- 45–60 seconds
- Tight hook in the first 3–5 seconds
- Clear value delivery + payoff
- CTA aligned to channel style

### Step 4: Create Veo-Ready Prompts (Paragraph Form)
For each script, generate a **single paragraph** prompt in `prompts/short_001_veo.txt`.
Prompts must be cinematic and concrete (subject, setting, camera movement, lighting, mood, pacing) and **not** bullet lists.
Use `assets/veo-prompt-template.txt` for structure.

### Step 5: Voice-Over Scripts + Chunked Audio
- Extract the final voice-over text from each script.
- Chunk into 120–160 word segments using:

```
python scripts/chunk_text.py --input "<script_text_file>" --out "<run_dir>/voice/short_001" --prefix "voice"
```

- For each chunk, call the integrated voice tool:
  - Use `generate_voice` **per chunk** (never one long request).
  - Save audio as `voice_part_01.mp3`, `voice_part_02.mp3`, etc. in the same folder.

### Step 6: Manifest + Extensibility Hooks
Create `manifests/run_manifest.json` with:
- channel info
- run timestamp
- list of shorts (script, prompt, voice chunk paths)
- voice settings (voice id, chunk size)
- status

Add empty placeholders for future optimization fields:
- `performance_notes`, `iterations`, `publish_schedule`.

## Offline Test Mode (No API)
Use the offline runner to test the full workflow without YouTube API calls:

```
python scripts/offline_test_run.py
```

- Uses `assets/sample_channel_dump.json`.
- Generates the full folder structure, scripts, prompts, and voice chunk text files.
- Marks the manifest as `dry_run` and does **not** generate audio files.

## Decision Rules
- If channel metadata is missing, stop and ask for a valid channel ID or handle.
- If API key is missing, request it or instruct the user to set `YOUTUBE_API_KEY`.
- Default to 5 Shorts if not specified.
- Always store outputs in a timestamped folder; never overwrite previous runs.
- Never request "previous viral video" details by default. If the user wants a viral analysis, generate it from channel data instead.

## Resources

### scripts/
- `youtube_channel_dump.py` — fetches channel and all video metadata.
- `chunk_text.py` — splits voice-over scripts into voice chunks.
- `offline_test_run.py` — offline dry-run pipeline (no API).

### references/
- `output-schema.md` — required folder + file layout.

### assets/
- `channel-report-template.md`
- `shorts-script-template.md`
- `veo-prompt-template.txt`
- `sample_channel_dump.json`
