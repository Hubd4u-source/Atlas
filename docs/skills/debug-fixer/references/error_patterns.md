# Common Error Patterns and Solutions

This reference provides detailed patterns for frequently encountered errors across different frameworks and environments.

## Table of Contents

1. [React & Next.js Errors](#react--nextjs-errors)
2. [Tailwind CSS Errors](#tailwind-css-errors)
3. [TypeScript Errors](#typescript-errors)
4. [Build Tool Errors](#build-tool-errors)
5. [Dependency Errors](#dependency-errors)
6. [Environment Errors](#environment-errors)

## React & Next.js Errors

### Hydration Mismatches

**Error pattern:**
```
Error: Text content does not match server-rendered HTML
Error: Hydration failed because the initial UI does not match
```

**Common causes:**
- Using browser-only APIs during SSR (window, localStorage, Date.now())
- Conditional rendering based on client state
- Third-party libraries that modify DOM
- Random values or timestamps in initial render

**Solutions:**
- Use `useEffect` for browser-only code
- Add `suppressHydrationWarning` for intentional mismatches
- Use `dynamic` import with `ssr: false` for client-only components
- Ensure server and client render identical HTML initially

### Client/Server Component Boundaries

**Error pattern:**
```
Error: You're importing a component that needs useState/useEffect
Error: Functions cannot be passed directly to Client Components
```

**Common causes:**
- Using hooks in Server Components
- Passing non-serializable props to Client Components
- Missing 'use client' directive

**Solutions:**
- Add 'use client' at top of files using hooks
- Convert functions to serializable data
- Split components at the boundary
- Use Server Actions for form handling

### Image Optimization Issues

**Error pattern:**
```
Error: Invalid src prop on `next/image`
Error: Image is missing required "alt" property
```

**Solutions:**
- Add hostname to next.config.js remotePatterns
- Provide alt text for accessibility
- Use correct image dimensions (width/height)
- Configure image loader if needed

## Tailwind CSS Errors

### Unknown Utility Classes

**Error pattern:**
```
Cannot apply unknown utility class `border-border`
Cannot apply unknown utility class `bg-primary`
```

**Root causes:**
- Missing theme extension in tailwind.config.js
- Custom colors not defined
- Using CSS variables without proper setup
- Tailwind version mismatch (v3 vs v4 syntax)

**Fix checklist:**
1. Check tailwind.config.js theme.extend.colors
2. Verify CSS variables are defined in globals.css
3. Ensure @tailwind directives are present
4. Check content configuration includes all files
5. Verify Tailwind version compatibility

**Example fix:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        primary: 'hsl(var(--primary))',
        background: 'hsl(var(--background))'
      }
    }
  }
}
```

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --border: 214.3 31.8% 91.4%;
    --primary: 222.2 47.4% 11.2%;
    --background: 0 0% 100%;
  }
}
```

### Missing PostCSS Configuration

**Error pattern:**
```
Error: PostCSS plugin tailwindcss requires PostCSS 8
```

**Solutions:**
- Install postcss and autoprefixer
- Create postcss.config.js
- Ensure compatible versions

## TypeScript Errors

### Module Resolution

**Error pattern:**
```
Cannot find module '@/components/Button'
Error TS2307: Cannot find module
```

**Common causes:**
- Missing path alias in tsconfig.json
- Incorrect baseUrl configuration
- File extension issues

**Solutions:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"]
    }
  }
}
```

### Type Errors

**Error pattern:**
```
Type 'X' is not assignable to type 'Y'
Property 'X' does not exist on type 'Y'
```

**Common fixes:**
- Add proper type annotations
- Use type assertions sparingly (as keyword)
- Install @types packages
- Fix strict null checks
- Use optional chaining (?.)

## Build Tool Errors

### Webpack/Vite Configuration

**Error pattern:**
```
Module parse failed: Unexpected token
Module not found: Can't resolve
```

**Common causes:**
- Missing loaders for file types
- Incorrect resolve configuration
- Plugin misconfiguration
- Import path issues

**Solutions:**
- Add appropriate loaders (babel-loader, css-loader, etc.)
- Configure resolve.alias for path shortcuts
- Check plugin compatibility and order
- Verify file extensions in resolve.extensions

### Module Format Issues

**Error pattern:**
```
require() of ES Module not supported
Cannot use import statement outside a module
```

**Causes and fixes:**
- Add "type": "module" to package.json for ESM
- Use .mjs extension for ES modules
- Configure babel to transform imports
- Check package exports and imports

## Dependency Errors

### Version Conflicts

**Error pattern:**
```
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! peer dependency conflict
```

**Resolution steps:**
1. Check package.json for version ranges
2. Use `npm ls <package>` to find conflicts
3. Update to compatible versions
4. Use --legacy-peer-deps as last resort
5. Consider using overrides/resolutions

### Missing Dependencies

**Error pattern:**
```
Module not found: Can't resolve 'package-name'
Cannot find module 'package-name'
```

**Solutions:**
- Install missing package: `npm install package-name`
- Check if devDependency should be dependency
- Verify package name spelling
- Clear node_modules and reinstall

## Environment Errors

### Port Conflicts

**Error pattern:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
- Change port in package.json scripts
- Kill process using port: `lsof -ti:3000 | xargs kill`
- Use different port: `PORT=3001 npm run dev`

### Missing Environment Variables

**Error pattern:**
```
Error: Missing environment variable
ReferenceError: process is not defined
```

**Solutions:**
- Create .env.local file
- Add variables to hosting platform
- Use NEXT_PUBLIC_ prefix for client-side vars
- Check .env.example for required variables

### Node Version Issues

**Error pattern:**
```
Error: The engine "node" is incompatible
SyntaxError: Unexpected token '?.'
```

**Solutions:**
- Check package.json engines field
- Use nvm to switch Node versions
- Update Node.js to required version
- Add .nvmrc file to specify version

## Debugging Techniques

### Systematic Approach

1. **Read the error completely** - Don't skip stack traces
2. **Identify the error type** - Syntax, runtime, build, type
3. **Locate the source** - File, line number, component
4. **Understand the context** - What changed recently?
5. **Form hypothesis** - What could cause this?
6. **Test the fix** - Verify it works
7. **Prevent recurrence** - Document or add safeguards

### Investigation Tools

- **Console logs** - Strategic placement in execution flow
- **Debugger** - Set breakpoints in browser DevTools
- **Network tab** - Check API calls and responses
- **React DevTools** - Inspect component state and props
- **Build output** - Read webpack/vite build logs carefully
- **Package manager logs** - Check npm/yarn error output

### Common Debugging Commands

```bash
# Clear build cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for dependency issues
npm ls <package-name>
npm outdated

# Verify Node/npm versions
node --version
npm --version

# Run with verbose logging
npm run dev --verbose
```

## Prevention Strategies

### Code Quality

- Use ESLint and TypeScript for early error detection
- Configure strict mode in tsconfig.json
- Add pre-commit hooks with husky
- Use proper error boundaries in React

### Configuration

- Keep configs in version control
- Document required environment variables
- Use consistent formatting (Prettier)
- Maintain up-to-date dependencies

### Development Practices

- Test changes incrementally
- Use version control effectively
- Read documentation for new packages
- Keep development and production configs aligned
