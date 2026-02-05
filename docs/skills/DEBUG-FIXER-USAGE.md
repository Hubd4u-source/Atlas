# Debug Fixer Skill - Usage Guide

## What This Skill Does

The **debug-fixer** skill provides Claude with systematic debugging and error resolution capabilities for code, applications, and development environments. It teaches Claude to:

1. **Analyze errors methodically** - Understanding error messages, stack traces, and context
2. **Identify root causes** - Going beyond symptoms to find underlying issues
3. **Implement proper fixes** - Solving problems at their source, not with workarounds
4. **Explain solutions clearly** - Documenting what was wrong and why the fix works

## When It Triggers

This skill automatically activates when users:
- Report errors or bugs in their code
- Share error messages or stack traces
- Ask to "fix", "debug", "resolve", or "troubleshoot" issues
- Experience build failures, runtime errors, or compilation problems
- Encounter framework-specific errors (React, Next.js, Tailwind, etc.)
- Face dependency conflicts or configuration issues

## Example: Your Tailwind CSS Error

Your error was:
```
CssSyntaxError: Cannot apply unknown utility class `border-border`
```

With this skill installed, Claude would:

1. **Understand the context**: Tailwind CSS error in a Next.js project
2. **Identify root cause**: Missing custom color definition in `tailwind.config.js`
3. **Implement the fix**: Add proper color configuration and CSS variables
4. **Verify the solution**: Explain what was misconfigured and why the fix works

## Key Features

### Systematic Workflow
- 4-step diagnostic process (Understand → Identify → Implement → Verify)
- Framework-specific error handling
- Configuration debugging checklist
- Common error pattern recognition

### Comprehensive Coverage
- React & Next.js (hydration, SSR, components)
- Tailwind CSS (utilities, configuration, PostCSS)
- TypeScript (module resolution, type errors)
- Build tools (Webpack, Vite, bundlers)
- Dependencies (version conflicts, peer dependencies)
- Environment (variables, ports, Node versions)

### Detailed Reference
The skill includes a comprehensive error patterns guide covering:
- 50+ common error scenarios
- Step-by-step resolution procedures
- Prevention strategies
- Debugging techniques

## How to Install

1. Upload the `debug-fixer.skill` file to Claude
2. Claude will automatically recognize it as a skill
3. The skill will activate when you encounter errors

## What You'll Notice

After installing this skill, when you share an error with Claude:

**Before**: Generic troubleshooting or basic fixes
**After**: 
- Systematic root cause analysis
- Targeted fixes with clear explanations
- Framework-specific solutions
- Prevention guidance
- Specific code changes with reasoning

## Best Practices

To get the most from this skill:

1. **Share complete error messages** - Include stack traces and context
2. **Mention what changed** - Recent modifications that might have caused issues
3. **Provide framework info** - What technologies you're using
4. **Share relevant files** - Configuration files help diagnose faster

## Example Usage

**You**: "My Next.js app is throwing a Tailwind error about unknown utility class 'bg-primary'"

**Claude with debug-fixer skill**:
- Analyzes: Tailwind CSS configuration issue
- Identifies: Missing custom color in theme
- Fixes: Adds color to tailwind.config.js and CSS variables
- Verifies: Explains the configuration requirement and shows exact changes
- Prevents: Suggests how to avoid similar issues

## Technical Details

- **Skill Type**: Workflow-based debugging system
- **Size**: Lightweight (~15KB packaged)
- **Resources**: 1 comprehensive reference document
- **Coverage**: Frontend, build tools, TypeScript, dependencies
- **Update Frequency**: Can be updated as new frameworks/patterns emerge

## Support

This skill is designed to handle the most common development errors. For very specialized or rare issues, Claude may still need to research solutions, but will apply the systematic debugging approach learned from this skill.
