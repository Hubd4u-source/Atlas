# Quality & Security Standards

description: Mandatory checklists for testing, security, and verification.

## Testing Strategy
- **Unit Tests**: Test individual functions (70%).
- **Integration Tests**: Test component interactions (20%).
- **E2E Tests**: Test user workflows (10%).
- **Coverage Target**: Aim for >80% code coverage.
- **Test Files**: Name as `*.test.ts` or `*.spec.ts`.

## Security Checklist
Before completing ANY task:
- [ ] No hardcoded secrets (API keys, passwords, tokens).
- [ ] All user inputs validated and sanitized.
- [ ] SQL injection prevention (use parameterized queries/ORMs).
- [ ] XSS prevention (escape output, use CSP headers).
- [ ] Authentication & authorization implemented.
- [ ] HTTPS enforced in production.
- [ ] Dependencies scanned: `npm audit`.
- [ ] Sensitive data encrypted at rest.
