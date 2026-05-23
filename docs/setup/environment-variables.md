# Environment Variables

See `.env.example` for the canonical template.

## API (`apps/api`)

| Var | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `development` / `test` / `production` |
| `API_PORT` | yes | Default `4000` |
| `API_GLOBAL_PREFIX` | yes | Default `api` |
| `API_CORS_ORIGINS` | yes | Comma-separated origin allowlist |
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_ACCESS_SECRET` | yes | ≥ 32 chars, random |
| `JWT_ACCESS_TTL` | no | Default `15m` |
| `JWT_REFRESH_SECRET` | yes | ≥ 32 chars, random, **different** from access |
| `JWT_REFRESH_TTL` | no | Default `30d` |
| `S3_*` | no | Required when media upload is enabled |

The API validates these via `apps/api/src/config/config.schema.ts` (Zod). Bad config
crashes on boot.

## Web (`apps/web`)

| Var | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Public API base URL |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | no | Defaults to `vi` |

## Mobile (`apps/mobile`)

| Var | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | yes | Public API base URL baked at build time |
| `EXPO_PUBLIC_DEFAULT_LOCALE` | no | Defaults to `vi` |

`EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` are exposed to client bundles — never put secrets there.
