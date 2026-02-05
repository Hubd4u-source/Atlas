---
name: debug-fixer
description: Systematic debugging and error resolution for code, applications, and development environments. Use when users report errors, bugs, or issues with code they've created or Claude has created. Triggers include error messages, stack traces, build failures, runtime errors, compilation errors, dependency conflicts, configuration issues, or requests to "fix", "debug", "resolve", or "troubleshoot" code problems. Handles framework-specific errors (React, Next.js, Tailwind, etc.), package manager issues, TypeScript errors, and environmental problems.
---

# Debug Fixer

## Overview

Systematic approach to debugging and fixing errors in code and development environments. Follow the diagnostic workflow to identify root causes and implement reliable fixes.

## Diagnostic Workflow

When encountering an error, follow this sequence:

### 1. Understand the Error Context

Analyze the error message components:
- **Error type**: Syntax error, runtime error, build error, type error, etc.
- **Location**: File path, line number, function/component name
- **Stack trace**: Execution path leading to the error
- **Environment**: Framework, dependencies, build tool, runtime

Ask clarifying questions only if critical context is missing:
- What action triggered the error?
- Is this a new project or existing codebase?
- What recent changes were made?

### 2. Identify the Root Cause

Apply systematic analysis:

**For dependency/import errors:**
- Check if package is installed (`package.json`, `requirements.txt`)
- Verify import paths and module resolution
- Check for version conflicts or missing peer dependencies
- Examine build configuration (webpack, vite, next.config.js)

**For syntax/compilation errors:**
- Review the exact line and surrounding context
- Check for typos, missing brackets, incorrect syntax
- Verify language/framework version compatibility
- Look for configuration issues (tsconfig.json, .babelrc)

**For runtime errors:**
- Trace the execution flow from stack trace
- Identify null/undefined references
- Check async operation handling
- Verify data types and API responses

**For build/bundler errors:**
- Examine bundler configuration
- Check for circular dependencies
- Verify file resolution and aliases
- Review plugin/loader configurations

**For CSS/styling errors:**
- Check CSS class availability
- Verify CSS module configuration
- Review PostCSS/preprocessor setup
- Confirm Tailwind/styling library configuration

### 3. Implement the Fix

Apply the solution with these principles:

**Root cause fixes over workarounds:**
- Fix the underlying issue, not just the symptom
- Avoid commenting out code or adding random try-catch blocks
- Address configuration problems properly

**Minimal changes:**
- Change only what's necessary
- Avoid refactoring unrelated code
- Keep the fix focused and traceable

**Verify the fix:**
- Explain what was wrong and why the fix works
- Show the specific changes made
- Confirm the fix doesn't introduce new issues

### 4. Provide the Corrected Code

When fixing code:
- Use `str_replace` to edit existing files in place
- Show before/after for clarity
- Update all affected files
- Include configuration changes if needed

## Common Error Patterns

### Framework-Specific Issues

**Next.js/React:**
- Client/Server component boundaries
- Hydration mismatches
- Image optimization issues
- API route errors
- App router vs Pages router differences

**Tailwind CSS:**
- Unknown utility classes (check tailwind.config.js)
- Missing @tailwind directives
- Content configuration for file scanning
- Plugin requirements

**TypeScript:**
- Type mismatches and any abuse
- Module resolution issues
- tsconfig.json misconfiguration
- Missing type definitions

**Build Tools:**
- Webpack/Vite configuration
- Babel transform issues
- Module format mismatches (ESM vs CommonJS)
- Path aliases and resolution

### Configuration Debugging

Check these common configuration issues:

**package.json:**
- Correct scripts defined
- Compatible dependency versions
- Proper module type (type: "module")

**Config files:**
- Syntax errors in JSON/JS config
- Incorrect paths or globs
- Missing required properties
- Plugin/preset configurations

**Environment:**
- Missing .env variables
- Wrong Node.js version
- Build cache corruption
- Port conflicts

## Example: Tailwind CSS Unknown Utility

For the error "Cannot apply unknown utility class `border-border`":

**Root cause analysis:**
1. Tailwind doesn't recognize `border-border` class
2. Likely missing custom color definition in config
3. Or using Tailwind v4 syntax in v3 setup

**Fix approach:**
1. Check `tailwind.config.js` for custom colors
2. Add missing color definition to theme.extend.colors
3. Verify Tailwind version and syntax compatibility
4. Ensure CSS imports correct @tailwind directives

**Implementation:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
      }
    }
  }
}
```

And ensure CSS variable is defined in globals.css:
```css
@layer base {
  :root {
    --border: 214.3 31.8% 91.4%;
  }
}
```

## Fix Verification

After implementing a fix:
- Explain what the error indicated
- Describe what was misconfigured or missing
- Confirm the fix addresses the root cause
- Suggest how to prevent similar issues

Avoid generic responses like "I've fixed the error" - be specific about what was wrong and what changed.

## Additional Resources

For detailed error patterns and solutions across frameworks:
- **Common Error Patterns**: See [references/error_patterns.md](references/error_patterns.md) for comprehensive troubleshooting guides for React, Next.js, Tailwind, TypeScript, build tools, dependencies, and environment issues.
