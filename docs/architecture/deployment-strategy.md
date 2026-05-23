# Deployment Strategy

## Environments

| Env | Purpose | DB | Branch |
|---|---|---|---|
| local | Dev laptop | Local Postgres or Docker | any |
| staging | Pre-prod, real-like data | Managed Postgres | `main` |
| production | Live | Managed Postgres + backups | `main` (tagged) |

## Web (`apps/web`)

- **Vercel** is the path of least resistance for Next.js. ISR + edge middleware
  (for next-intl) are supported out of the box.
- Alternative: self-host as a Node image (see `Dockerfile.web`).

## API (`apps/api`)

- **Docker image** (`Dockerfile.api`) deployed to Fly.io / Render / Railway / k8s.
- Run `prisma migrate deploy` as a release-phase hook before bringing up new pods.
- Run at least 2 replicas behind a load balancer.

## Mobile (`apps/mobile`)

- **EAS Build** for native binaries. EAS Update for OTA JS bundle updates.
- `EXPO_PUBLIC_API_URL` baked at build time per channel.

## Secrets

Stored in the platform's secret manager. Never in the repo.
Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`API_CORS_ORIGINS`, `S3_*`.

## Release flow

1. PR → CI (lint, typecheck, build, test).
2. Merge to `main` → staging deploy.
3. Tag release → production deploy.
4. DB migrations are part of the API release; web/mobile must remain
   backwards-compatible for one release.

## Rollback

- Web/API: redeploy previous immutable image.
- DB: never auto-rollback migrations. Forward-fix with a new migration.
- Mobile OTA: `eas update --rollback`.
