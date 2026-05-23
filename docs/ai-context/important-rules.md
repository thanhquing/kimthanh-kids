# Important Rules for AI Agents

These are blocking rules. Violating any of these is a regression.

## TypeScript

1. `strict: true` everywhere. Do not relax `tsconfig` flags.
2. Avoid `any`. Prefer `unknown` + narrowing, generics, or a precise type.
3. All public functions and exported APIs are typed.
4. Use `import type` for type-only imports.

## Architecture

1. **Never bypass shared packages.** Apps consume the API via `@kimthanh/shared-api-client`,
   not raw `fetch`.
2. **Do not duplicate DTOs.** Add new shared shapes to `@kimthanh/shared-types`.
3. **Do not import from `apps/*` inside `packages/*`.** The arrow is one-way:
   `apps → packages`.
4. **Frontend code does not import server-only code.** Web should import from package
   entrypoints only, never reach into `apps/api`.

## i18n

1. **No hardcoded user-facing strings.** Always `t('namespace.key')`.
2. Add the key to both `vi` and `en` locale files in the same change.
3. Vietnamese is the default for end users. English is the codebase language.
4. Error messages on the API use `messageKey` (e.g. `errors.auth.invalidCredentials`) —
   the UI translates from that key.

## Security

1. Never log secrets, tokens, or passwords.
2. Refresh tokens are stored as `sha256` hashes server-side. They are rotated on each
   `/auth/refresh`.
3. Mobile stores tokens in `expo-secure-store`. Web stores in `localStorage` (acceptable
   for this SPA pattern; OK to upgrade to httpOnly cookies later — see ADR).
4. CORS origins, JWT secrets, and `DATABASE_URL` come from env. Never hardcode.

## Database (Prisma)

1. UUID primary keys, `createdAt` / `updatedAt` timestamps on every table.
2. Tenant tables include `schoolId` and are indexed on it.
3. Soft delete via `deletedAt` where applicable.
4. Never run `prisma db push` against production. Use migrations.

## Code quality

1. No dead code, no commented-out blocks left behind.
2. No backwards-compat shims for code that nothing depends on yet.
3. Comments only for non-obvious *why*. Never narrate the *what*.
4. New features add tests when the surface is non-trivial (services, RBAC paths).
