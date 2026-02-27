# Output Schema & Folder Layout

Use this canonical layout for every run. Folder name must include date + time.

Base output directory:
`D:/Projects/AGI/atlas/output/shorts/<channel_slug>/<YYYY-MM-DD_HH-mm-ss>`

Required subfolders:
- `analysis/` (channel capability report)
- `metadata/` (raw channel + video dumps)
- `scripts/` (shorts scripts)
- `prompts/` (Veo-ready prompts, paragraph form)
- `voice/` (chunked voice-over audio + chunk text files)
- `manifests/` (JSON overview of produced assets)

Required files:
- `analysis/channel_profile.md`
- `metadata/channel_dump.json`
- `manifests/run_manifest.json`

`run_manifest.json` should include:
- channel title, id, handle
- run timestamp
- list of shorts (id, title, script path, prompt path, voice chunks)
- voice settings (chunk size, voice id, api)
- status (success/fail)

Naming conventions:
- `short_001.md`, `short_002.md`
- `short_001_veo.txt`
- `short_001/voice_part_01.mp3` and `short_001/voice_part_01.txt`

Keep all artifacts local in the run folder. Do not overwrite previous runs.
