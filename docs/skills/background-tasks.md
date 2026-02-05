# Background Tasks & Long-Running Processes

description: Best practices for running servers, dev environments, and background commands.

## Critical Rules
- **Do NOT always use background tasks.**
- Prefer `inBackground: true` for servers/watch modes **only after** a successful first run.
- **First run / unknown state**: run in the foreground to capture startup errors and logs. If it starts cleanly, then rerun in background.
- Avoid backgrounding commands that are expected to exit quickly or provide important one-time diagnostics.
- Use `kill_process(process_id)` when the task is finished.

## Examples
- First run (foreground): `run_command("npm run dev")`
- After it starts cleanly: `run_command("npm run dev", { inBackground: true })`
- `run_command("python manage.py runserver")` (first run), then background on restart
- `run_command("docker-compose up")` (first run), then background on restart
- `run_command("npm start")` (first run), then background on restart
