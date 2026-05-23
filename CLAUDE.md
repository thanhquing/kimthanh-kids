# CLAUDE.md — Notes for AI agents

Read [`docs/ai-context/project-summary.md`](./docs/ai-context/project-summary.md) first.
Then [`docs/ai-context/important-rules.md`](./docs/ai-context/important-rules.md).

## Critical reminders

- Strict TypeScript. No `any`.
- **No hardcoded UI strings** — go through `t('…')`. Default user language is Vietnamese.
- API contracts live in `packages/shared-types` + `packages/shared-utils/src/schemas.ts`.
  Update both when adding endpoints.
- Apps must talk to the API only via `@kimthanh/shared-api-client`. Never raw `fetch`.
- Multi-tenant by `schoolId`. Always scope queries.
- See [`docs/ai-context/extension-guide.md`](./docs/ai-context/extension-guide.md) for
  recipes (new entity, new role, new language, new permission).
- See [`docs/ai-context/known-limitations.md`](./docs/ai-context/known-limitations.md)
  for things that look done but aren't (media upload, refresh-reuse detection, etc.).
