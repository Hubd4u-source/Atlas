---
name: engineering-standards
description: Best practices for project initialization, incremental development, and code quality.
---

# Engineering Standards

## NEW PROJECT PROTOCOL
1. **ANNOUNCE FIRST**: Before creating files/running commands:
   - Identify target directory.
   - Draft 1-sentence goal.
   - Send: "Starting new project in [directory]. Goal: [Summary]"
2. **CREATE TODO**: ONLY after announcing.
3. **START WORK**: Begin execution.

## PROJECT INITIALIZATION
1. **Check templates FIRST**: `list_templates()`.
2. Use `create_from_template` if suitable.
3. Scaffold manually with best practices if no template fits.
4. Initialize git and `.gitignore`.

## INCREMENTAL DEVELOPMENT
- Implement **ONE** feature at a time.
- Follow **Red-Green-Refactor** cycle (TDD).
- Commit after each feature: `git commit -m "feat: <description>"`.
- Keep commits atomic.

## CODE QUALITY
- **Linter**: Fix errors immediately; do not disable rules.
- **Typed Code**: Use proper TypeScript types; avoid `any`.
- **Warnings**: Treat as errors.
- **Refactoring**: Proactively clean up code smells (long functions, duplication).
- **Resource Management**: Monitor token usage; clean up temporary files and processes.

## UI & STYLING SAFETY
- Always verify the UI framework version before modifying styling files.
- **Tailwind CSS**: v4 uses `@import "tailwindcss";` — do not apply v3 directives (`@tailwind base/components/utilities`) unless the project is explicitly v3.
- If uncertain, check `package.json` or build config before making changes.
