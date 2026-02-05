---
name: task-management
description: Mandatory protocols for tracking, breaking down, and prioritizing tasks using the TODO system.
---

# Task Management & TODO Protocol

As an autonomous agent, you MUST track your progress using the built-in TODO system. This ensures transparency for the user and state persistence across restarts.

## MANDATORY TASK TRACKING
Every user request MUST be tracked, **UNLESS** it is purely conversational.

### CONVERSATIONAL EXCEPTION
- **IF** the user request is a Question, Greeting, or General Discussion (e.g., "Hi", "Explain this file", "What skills do you have?").
- **IF** the request is a SHORT NOUN PHRASE (e.g., "skills folder", "status", "logs", "current task") with NO specific action verb.
- ✅ **ANSWER DIRECTLY**. Do NOT create a task. Do NOT call `add_todo`.

### 1. IMMEDIATE TASK CREATION
- **IF** the user request requires ACTION/ENGINEERING (e.g., "Fix", "Create", "Refactor", "Run", "Build").
- You MUST: `add_todo({ title: "Task Title", priority: "high" })` BEFORE executing any fix actions.

### 2. TASK BREAKDOWN
- Large tasks (>30min) should be split into subtasks.
- Each subtask = separate todo with parent reference.

### 3. STATUS UPDATES
Call `update_todo` at every significant milestone:
- Starting: `status: "in_progress"`
- Progress: `progress: X, notes: "description"`
- Blocked: `status: "blocked", notes: "reason"`
- Completed: `status: "completed", progress: 100`

## COMPLETION CRITERIA
A task is ONLY complete when:
- ✅ Primary functionality working as specified.
- ✅ All tests passing (unit, integration, e2e).
- ✅ No linter or type errors.
- ✅ Build succeeds without warnings.
- ✅ Visual verification complete (for UI changes).
- ✅ Documentation updated.

## PRIORITIZATION FRAMEWORK
- **CRITICAL**: Security, prod outages, data loss.
- **HIGH**: User-blocking bugs, core features.
- **MEDIUM**: Tech debt, refactoring, performance.
- **LOW**: Cosmetics, nice-to-haves.

## TASK QUEUE (24/7 AUTONOMOUS EXECUTION)
Use the durable task queue for multi-task requests and scheduled work.

### WHEN TO USE
- The user provides multiple tasks in one message.
- Work should be scheduled for later.
- Long-running autonomous work that must survive restarts.

### REQUIRED BEHAVIOR
- Split tasks and enqueue them with `enqueue_tasks`.
- Execute tasks serially (one at a time).
- Prefer clear, atomic task titles and detailed descriptions.

### TOOLS
- `enqueue_tasks`: Create one or more tasks with optional scheduling.
- `list_tasks`: Inspect queue state.
- `schedule_task`: Create recurring scheduled tasks (cron-based).
