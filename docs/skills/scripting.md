---
name: Shell & Scripting
description: Best practices for writing robust, safe, and maintainable automation scripts.
---

# Shell Scripting & Automation Standards

> [!IMPORTANT]
> **Use Node.js for complexity.** If a shell script exceeds ~50 lines or requires complex logic (JSON parsing, API calls), rewrite it as a Node.js script (TypeScript preferred) or a proper CLI tool. Shell scripts are for **glue code**.

## 1. Core Philosophy (The "Safe Script" Pledge)
All automation scripts must adhering to these three rules:
1.  **Fail Fast**: If a command fails, the whole script stops. Never continue in an inconsistent state.
2.  **Idempotent**: Running the script twice should result in a successful state, not an error or duplicated data.
3.  **No Side Effects**: Clean up temporary files, kill child processes, and reset environment variables on exit.

---

## 2. Bash Standards (Linux/macOS)

### The Golden Preamble
Every Bash script MUST start with this "Safe Mode" header:
```bash
#!/bin/bash

# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error.
# -o pipefail: Pipeline fails if ANY command in the pipeline fails (not just the last one).
set -euo pipefail

# CONSTANTS
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/tmp/my-script-$(date +%s).log"
```

### Logging & Output
Don't use raw `echo`. Use semantic functions:
```bash
log_info() { echo -e "\033[34m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[33m[WARN]\033[0m $1" >&2; }
log_error() { echo -e "\033[31m[ERROR]\033[0m $1" >&2; }
log_success() { echo -e "\033[32m[SUCCESS]\033[0m $1"; }
```

### Trap & Cleanup
Always clean up, even on failure (Ctrl+C or error):
```bash
cleanup() {
  log_info "Cleaning up..."
  rm -f /tmp/temp-data.json
}
# Run cleanup on EXIT (normal or error)
trap cleanup EXIT
```

---

## 3. PowerShell Standards (Windows)

### The Golden Preamble
PowerShell is lenient by default. Make it strict:
```powershell
# Require a specific version if needed
#Requires -Version 5.0

# Stop on any error
$ErrorActionPreference = 'Stop'

# Strict mode version 3.0 (catches undefined variables, etc.)
Set-StrictMode -Version 3.0

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
```

### Semantic Logging
Use `Write-Host` with colors for user feedback, `Write-Verbose` for debug info.
```powershell
function Write-Info($Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success($Message) { Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-ErrorLog($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Usage:
# Write-Info "Starting task..."
```

### Tool Checks
Before running tools, check if they exist:
```powershell
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-ErrorLog "npm is required but not found."
    exit 1
}
```

---

## 4. Cross-Platform Strategy

When working in a team with mixed OS (Windows/Mac/Linux):

1.  **Avoid OS-specific scripts** if possible. Use `package.json` scripts.
2.  **Use `shx`**: A portable shell library for npm.
    ```json
    "scripts": {
      "clean": "shx rm -rf dist",
      "makedir": "shx mkdir -p build/logs"
    }
    ```
3.  **Google/Microsoft `zx`**: For writing scripts in JavaScript that feel like shell.
    ```javascript
    #!/usr/bin/env zx
    await $`cat package.json | grep name`
    let branch = await $`git branch --show-current`
    await $`depoy --branch=${branch}`
    ```

---

## 5. Common Patterns & Snippets

### A. Checking for Arguments (Bash)
```bash
if [[ $# -eq 0 ]]; then
    log_error "Usage: $0 <environment>"
    exit 1
fi
ENV="$1"
```

### B. Waiting for a Service (Loop with Timeout)
```bash
wait_for_port() {
  local port=$1
  local retries=30
  log_info "Waiting for port $port..."
  while ! nc -z localhost $port; do
    sleep 1
    ((retries--))
    if [[ $retries -eq 0 ]]; then
      log_error "Timed out waiting for port $port"
      exit 1
    fi
  done
  log_success "Port $port is open!"
}
```

### C. Reading .env Files
**Bash:**
```bash
if [ -f .env ]; then
  # Automatically export variables
  set -a
  source .env
  set +a
fi
```
**PowerShell:**
```powershell
Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object {
    $Name, $Value = $_.Split('=', 2)
    [Environment]::SetEnvironmentVariable($Name, $Value)
}
```

---

## 6. Security Checklist
- [ ] **Never hardcode secrets**. Use `source .env` or environment variables.
- [ ] **Quote variables**. Always use `"$VAR"` in Bash to prevent word splitting.
- [ ] **Don't `curl | bash`** without reviewing the script first.
- [ ] **Limit permissions**. Scripts should not run as root/admin unless absolutely necessary.
