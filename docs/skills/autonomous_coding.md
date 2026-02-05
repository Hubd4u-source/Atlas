# Advanced Autonomous Coding Skills v2.0
> A comprehensive guide for 24/7 autonomous AI agents

## 🧠 Self-Healing Code Protocol

### Error Resolution Framework
When you encounter an error, follow this systematic approach:

1. **Capture & Classify**
   - Read the full error output (stack trace, error code, line number)
   - Classify: Syntax | Type | Runtime | Dependency | Logic | Integration
   - Determine severity: Critical | High | Medium | Low

2. **Root Cause Analysis**
   - Trace error to source file and exact line
   - Read surrounding context (±20 lines minimum)
   - Check recent changes that might have introduced the issue
   - Review related files (imports, dependencies, calling functions)

3. **Intelligent Fixing**
   - **Type Errors**: Fix interface definitions, add proper type guards, use correct generics
   - **Missing Dependencies**: Install with `npm install <package>` or equivalent, update package.json
   - **Logic Errors**: Add debug logging, trace data flow, verify algorithm correctness
   - **API Errors**: Check endpoint availability, validate request/response formats, handle edge cases
   - **Build Errors**: Clear caches, rebuild dependencies, check configuration files

4. **Verification Protocol**
   - Run tests immediately after fix
   - Check for regression in related features
   - Validate edge cases
   - Monitor for cascading errors

5. **Prevention Documentation**
   - Log the error and solution in `ERRORS.md`
   - Add test case to prevent recurrence
   - Update type definitions if applicable

---

## 🏗️ Robust Architecture Principles

### Code Organization
```
project/
├── src/
│   ├── core/           # Core business logic
│   ├── services/       # External integrations
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript interfaces
│   ├── config/         # Configuration
│   └── tests/          # Test files
├── docs/               # Documentation
└── scripts/            # Build/deploy scripts
```

### Design Guidelines
- **Single Responsibility**: Each function/class does ONE thing well
- **Modular Functions**: Keep functions under 50 lines, classes under 300
- **Typed Everything**: Define interfaces for all data structures, API responses, configs
- **Dependency Injection**: Make dependencies explicit and testable
- **Immutability**: Prefer const, avoid mutations, use pure functions where possible

### Error Handling Strategy
```typescript
// Wrap all risky operations
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  return { success: false, error: error.message };
}
```

### Logging Best Practices
- **Development**: Log liberally with context
- **Production**: Log errors, warnings, and key events only
- **Structure**: Use structured logging (JSON format)
- **Levels**: DEBUG → INFO → WARN → ERROR → CRITICAL
- **Cleanup**: Remove debug logs before production deployment

---

## 🔄 The Autonomy Loop

### Continuous Operation Framework
```
┌─────────────────────────────────────┐
│  1. Receive Task                    │
│  2. Plan & Break Down               │
│  3. Execute Iteration               │
│  4. Verify Results                  │
│  5. Document Progress               │
│  6. Check Completion                │
└─────────────────────────────────────┘
         │                     │
         │  Not Complete       │
         └─────────────────────┘
```

### Task Decomposition
- Break large tasks into subtasks (< 30 min each)
- Prioritize: Critical → High → Medium → Low
- Document in `TODO.md` or project management tool
- Track dependencies between tasks

### State Management
- Use `PROGRESS.md` for current state
- Use `COMPLETED.md` for finished tasks
- Use `BLOCKED.md` for issues requiring human intervention
- Timestamp all entries

### Completion Criteria
Never stop until:
- ✅ All acceptance criteria met
- ✅ Tests passing (unit, integration, e2e)
- ✅ Code reviewed (automated linting/formatting)
- ✅ Documentation updated
- ✅ No critical/high severity issues
- ✅ User explicitly confirms completion

---

## 🧪 Testing & Quality Assurance

### Testing Pyramid
1. **Unit Tests** (70%): Test individual functions
2. **Integration Tests** (20%): Test component interactions
3. **E2E Tests** (10%): Test full user workflows

### Automated Testing Protocol
```bash
# Before committing any code
npm run lint          # Check code style
npm run type-check    # Verify TypeScript types
npm run test          # Run all tests
npm run build         # Ensure buildable
```

### Test-Driven Development (TDD)
1. Write failing test first
2. Write minimal code to pass
3. Refactor while keeping tests green
4. Repeat

---

## 🚀 Deployment & CI/CD

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No console.log in production code
- [ ] Environment variables configured
- [ ] Dependencies updated and secure
- [ ] Performance benchmarks acceptable
- [ ] Error tracking configured
- [ ] Rollback plan ready

### Continuous Integration
```yaml
# Example CI pipeline
- lint
- type-check
- test (unit + integration)
- build
- security scan
- deploy to staging
- smoke tests
- deploy to production
```

---

## 🔍 Debugging Strategies

### Systematic Debugging
1. **Reproduce**: Create minimal reproducible case
2. **Isolate**: Binary search to narrow down problem area
3. **Hypothesize**: Form theory about what's wrong
4. **Test**: Verify hypothesis with targeted changes
5. **Fix**: Implement solution
6. **Validate**: Ensure fix works and no regressions

### Advanced Debugging Tools
- **Chrome DevTools**: Breakpoints, network inspection, performance profiling
- **VS Code Debugger**: Step-through debugging, variable inspection
- **Logging Libraries**: Winston, Pino for structured logging
- **APM Tools**: Monitor production performance and errors
- **Memory Profiling**: Detect memory leaks

---

## 📊 Performance Optimization

### Optimization Checklist
- [ ] Minimize bundle size (code splitting, tree shaking)
- [ ] Optimize images (compression, lazy loading, WebP format)
- [ ] Cache API responses
- [ ] Use CDN for static assets
- [ ] Implement database indexing
- [ ] Minimize re-renders (React.memo, useMemo, useCallback)
- [ ] Use pagination/infinite scroll for large lists
- [ ] Profile and optimize hot paths

### Performance Budgets
- **Initial Load**: < 3 seconds
- **Time to Interactive**: < 5 seconds
- **Bundle Size**: < 200KB (gzipped)
- **API Response**: < 300ms (p95)

---

## 🔐 Security Best Practices

### Security Checklist
- [ ] Validate all user input
- [ ] Sanitize data before database queries (prevent SQL injection)
- [ ] Use parameterized queries/ORMs
- [ ] Implement authentication & authorization
- [ ] Use HTTPS everywhere
- [ ] Set secure HTTP headers (CSP, HSTS, X-Frame-Options)
- [ ] Keep dependencies updated (run `npm audit`)
- [ ] Never commit secrets (use `.env` files, secret managers)
- [ ] Implement rate limiting
- [ ] Log security events

---

## 📝 Documentation Standards

### Code Documentation
```typescript
/**
 * Calculates the total price including tax
 * 
 * @param basePrice - The price before tax
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @returns The total price with tax applied
 * @throws {Error} If basePrice or taxRate is negative
 * 
 * @example
 * calculateTotal(100, 0.1) // Returns 110
 */
function calculateTotal(basePrice: number, taxRate: number): number {
  if (basePrice < 0 || taxRate < 0) {
    throw new Error('Price and tax rate must be non-negative');
  }
  return basePrice * (1 + taxRate);
}
```

### Project Documentation
- `README.md`: Overview, setup, usage
- `CONTRIBUTING.md`: How to contribute
- `ARCHITECTURE.md`: System design, tech stack
- `API.md`: API endpoints and examples
- `CHANGELOG.md`: Version history

---

## 🤖 AI Agent-Specific Protocols

### Memory Management
- Regularly summarize progress in `MEMORY.md`
- Keep context focused on current task
- Archive completed work details
- Maintain decision log for complex choices

### Human Escalation
Escalate to human when:
- Ambiguous requirements need clarification
- Business logic decision required
- Security/privacy concerns arise
- Multiple valid solutions exist (architectural choice)
- External system integration fails repeatedly
- Task blocked for > 2 hours

### Self-Improvement
- Track common errors in `LESSONS.md`
- Identify patterns in failures
- Update protocols based on learnings
- Suggest process improvements

---

## ⚡ Productivity Hacks

### Batch Operations
- Run multiple tests in parallel
- Install multiple packages at once
- Process files concurrently where safe

### Keyboard Shortcuts & CLI Efficiency
```bash
# Aliases for common operations
alias t='npm test'
alias b='npm run build'
alias d='npm run dev'
alias l='npm run lint'
```

### Code Generation
- Use snippets for boilerplate
- Generate tests from code
- Auto-format on save
- Use code generators (Plop, Hygen)

---

## 🎯 Goal: Zero-Touch Deployment

### The Ultimate Autonomous System
```
User Request → AI Plans → AI Codes → Tests Pass → Auto Deploy → Monitor → Self-Heal
```

### Metrics to Track
- **Mean Time to Resolution** (MTTR): < 30 minutes
- **Test Coverage**: > 80%
- **Build Success Rate**: > 95%
- **Deployment Frequency**: Multiple per day
- **Error Rate**: < 1% of requests
- **Uptime**: > 99.9%

---

## 🛠️ Essential Tools & Commands

### Package Management
```bash
npm install <package>       # Install dependency
npm install -D <package>    # Install dev dependency
npm update                  # Update dependencies
npm audit fix               # Fix security vulnerabilities
npm run <script>            # Run package.json script
```

### Git Operations
```bash
git status                  # Check status
git add .                   # Stage all changes
git commit -m "message"     # Commit with message
git push                    # Push to remote
git pull                    # Pull from remote
git checkout -b <branch>    # Create new branch
```

### File Operations
```bash
cat <file>                  # Read file
tail -n 50 <file>          # Read last 50 lines
grep -r "pattern" .        # Search in files
find . -name "*.ts"        # Find files by pattern
```

---

## 🚨 Emergency Protocols

### When Everything Breaks
1. **Don't Panic**: Take a systematic approach
2. **Rollback**: Revert to last known good state
3. **Isolate**: Identify what changed
4. **Communicate**: Update stakeholders
5. **Fix Forward**: Apply minimal fix
6. **Post-Mortem**: Document what happened and how to prevent

### Recovery Checklist
- [ ] Service restored
- [ ] Root cause identified
- [ ] Fix applied and tested
- [ ] Monitoring confirms stability
- [ ] Documentation updated
- [ ] Prevention measures implemented

---

## 📈 Continuous Improvement

### Weekly Review
- Review `ERRORS.md` for patterns
- Update this guide with new learnings
- Refactor recurring code into utilities
- Optimize slowest operations
- Update dependencies

### Monthly Audit
- Security audit (`npm audit`)
- Performance benchmarks
- Test coverage analysis
- Dead code removal
- Documentation review

---

## 🎓 Advanced Patterns

### Retry Logic with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  // ... implementation details
}
```

---

## 🏁 Final Mandate

**As an autonomous agent, you MUST:**
- ✅ Always verify your work
- ✅ Write tests for new code
- ✅ Handle errors gracefully
- ✅ Document your decisions
- ✅ Optimize continuously
- ✅ Never leave broken code
- ✅ Escalate when truly stuck
- ✅ Learn from every error

**Remember**: You're not just writing code—you're building reliable, maintainable, production-ready systems that run 24/7.

---

*Last Updated: 2026-02-01*
*Version: 2.0*