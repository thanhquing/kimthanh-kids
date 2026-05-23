# Deployment

See `architecture/deployment-strategy.md` for the high-level plan. This page is
the operational checklist.

## API

```bash
docker build -f apps/api/Dockerfile -t kimthanh-api:<sha> .
docker push <registry>/kimthanh-api:<sha>
# In your platform:
#   1) set env vars (DATABASE_URL, JWT_*, S3_*…)
#   2) release-phase command: prisma migrate deploy
#   3) start command: node dist/main.js
```

## Web

- **Vercel**: `apps/web` directory, framework auto-detected. Set `NEXT_PUBLIC_API_URL`.
- **Docker**: `docker build -f apps/web/Dockerfile -t kimthanh-web:<sha> .`

## Mobile

```bash
# Initial EAS setup (once)
pnpm --filter @kimthanh/mobile dlx eas-cli login
pnpm --filter @kimthanh/mobile dlx eas-cli build:configure

# Build
pnpm --filter @kimthanh/mobile dlx eas-cli build -p ios
pnpm --filter @kimthanh/mobile dlx eas-cli build -p android

# OTA update
pnpm --filter @kimthanh/mobile dlx eas-cli update --branch production
```

## Pre-release checklist

- [ ] Migrations reviewed and reversible (forward-fix plan if not).
- [ ] Env vars set in target environment.
- [ ] CORS origins include the deployed web URL.
- [ ] Mobile `EXPO_PUBLIC_API_URL` matches the deployed API.
- [ ] Smoke test login + a representative read endpoint.
