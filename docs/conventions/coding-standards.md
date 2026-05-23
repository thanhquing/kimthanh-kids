# Coding Standards

- Format with Prettier (`pnpm format`).
- Lint with ESLint (`pnpm lint`). All lint warnings are fixable; PRs with warnings
  are tolerated but tracked.
- No `console.log` (warn/error allowed via lint rule).
- Prefer pure functions in `packages/shared-utils`. Side effects live in apps.
- Prefer immutability. No mutating array/object utilities.
- Throw `HttpException` subclasses (`BadRequestException`, …) — never bare `Error` in
  request handlers.
- Functions exported from packages must have explicit return types.
- Test files: `*.spec.ts` adjacent to source.
