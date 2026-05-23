# Local Development

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (or Docker)
- Optional: Expo CLI for mobile

## First-time setup

```bash
# Install deps
pnpm install

# Bring up Postgres (Docker)
docker run --name kt-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15

# Copy env
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_*_SECRET (32+ chars each)

# Initialize DB
pnpm --filter @kimthanh/api db:generate
pnpm --filter @kimthanh/api db:migrate
pnpm --filter @kimthanh/api db:seed
```

Seed creates: `admin@kimthanh.school`, `teacher@kimthanh.school`, `parent@kimthanh.school`
— all with password `Password123`.

## Run everything

```bash
# In separate shells:
pnpm --filter @kimthanh/api dev        # http://localhost:4000/api
pnpm --filter @kimthanh/web dev        # http://localhost:3000
pnpm --filter @kimthanh/mobile dev     # Expo dev server
```

Or `pnpm dev` from the root (turbo runs all).

## Useful commands

| Command | Purpose |
|---|---|
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm format` | Prettier write |
| `pnpm --filter @kimthanh/api db:migrate -- --name <slug>` | New migration |
| `pnpm --filter @kimthanh/api db:reset` | Reset DB + run seed |
