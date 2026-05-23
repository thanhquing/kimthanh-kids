# Security Best Practices

## In place

- `helmet()` HTTP headers.
- CORS allowlist via `API_CORS_ORIGINS`.
- JWT access (15m) + refresh (30d) with **rotation** + sha256 hashing of refresh
  tokens at rest.
- Bcrypt (10 rounds) password hashing.
- Throttler global guard (120 req/min default).
- Zod + class-validator request validation on every controller.
- `forbidNonWhitelisted: true` on global ValidationPipe — extra fields rejected.

## Rules

- Never store secrets in the repo. `.env` is gitignored; `.env.example` is the template.
- Never log tokens or passwords.
- Never trust client-supplied `userId`, `schoolId`. Derive from `req.user`.
- Tenant scoping (`schoolId`) and parent scoping must be enforced in service layer,
  not only in controllers.

## Hardening checklist for production

- [ ] Rotate JWT secrets; store in a secrets manager.
- [ ] Move web tokens from `localStorage` to httpOnly cookies with SameSite=Lax and CSRF.
- [ ] Enable HSTS / TLS termination at the edge.
- [ ] Add WAF + rate limit at the edge.
- [ ] Refresh-token-reuse detection.
- [ ] Audit log table for write actions.
- [ ] Vulnerability scanning (`pnpm audit` in CI).
- [ ] Backup + PITR for PostgreSQL.
