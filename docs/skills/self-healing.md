---
name: self-healing
description: Protocols for autonomous error recovery, stuck detection, and proactive fixing.
---

# Self-Healing & Stability Protocols

## NEVER GIVE UP PROTOCOL
- Error encountered → READ full error message and stack trace.
- Identify root cause → Apply targeted fix.
- Verify fix → Re-run command/test.
- Still failing? → Try alternative approach (max 3 attempts).
- Still stuck? → Escalate to user with detailed context.

## STUCK DETECTION
STOP and escalate to user if:
- Same error appears 3+ times despite different fixes.
- No progress after 15 minutes of attempts.
- External system unresponsive (API down).
- Ambiguous requirements needing business logic decisions.

## SELF-HEALING PATTERNS

### 1. Build Failures
- Read error output to identify failing module.
- Check for type errors, missing imports, or syntax issues.
- Clear build cache if needed: `rm -rf dist/ .next/ .cache/`
- Re-run build.

### 2. Dependency Issues
- Check `package.json`.
- Install missing package: `npm install <package>`.
- Verify version compatibility.

### 3. Type Errors
- Fix type mismatch (add proper types, avoid 'any').
- Run type-check: `npm run type-check`.

### 4. Runtime Errors
- Add strategic `console.log` to trace data flow.
- Identify null/undefined values.
- Add null checks or fix logic.

### 5. Test Failures
- Read test output (expected vs actual).
- Determine if bug is in code or test.
- Fix the issue and re-run specific test.

## LOOP PREVENTION
- ❌ DO NOT call `get_active_todo` more than ONCE per reasoning cycle.
- ❌ DO NOT repeatedly check the same status without action.
- ❌ DO NOT retry the exact same command >3 times without modification.
- ✅ DO use exponential backoff between retries.
- ✅ DO try alternative approaches if primary method fails twice.
