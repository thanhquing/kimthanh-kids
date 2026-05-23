# Troubleshooting

## `prisma migrate dev` says "schema drift"

Your local DB diverged from the migration history. Either:

- `pnpm --filter @kimthanh/api db:reset` (destroys local data, re-applies migrations + seed), or
- introspect and create a new migration.

## API boot fails with `JWT_ACCESS_SECRET min 32`

`config.schema.ts` enforces 32-char minimum. Regenerate:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Web shows untranslated keys like `auth.login`

Locale JSON didn't load. Check:

1. `apps/web/locales/<locale>/common.json` exists and is valid JSON.
2. The path segment is `vi` or `en` (see `apps/web/src/i18n/config.ts`).

## Mobile cannot reach API on simulator

- iOS: use `http://localhost:4000/api`.
- Android emulator: `http://10.0.2.2:4000/api`.
- Physical device: use your laptop's LAN IP and ensure the API binds to `0.0.0.0`.

## "Workspace dependency not found"

Run `pnpm install` at the repo root. Workspace `workspace:*` deps require the root
install — installing inside a subfolder does not link siblings.

## Type errors after editing `shared-types`

Restart TS server (VS Code: `TypeScript: Restart TS Server`). Packages export source
TS directly (no build step), so no rebuild needed.
