# KimThanh Kindergarten — Monorepo

Multi-platform kindergarten management ecosystem:

- **`apps/web`** — Marketing site + admin / finance / nurse dashboards (Next.js 14 + next-intl).
- **`apps/mobile`** — Parent + teacher app (Expo SDK 51 + i18next).
- **`apps/api`** — REST API (NestJS + Prisma + PostgreSQL + JWT/RBAC).
- **`packages/*`** — Shared types, utils, API client, auth, UI primitives.
- **`docs/`** — AI-readable architecture, conventions, product, setup, and ADRs.

## Quick start

```bash
nvm use && corepack enable && corepack prepare pnpm@9.1.0 --activate
pnpm install
cp .env.example .env   # fill JWT secrets + DATABASE_URL
pnpm --filter @kimthanh/api db:generate
pnpm --filter @kimthanh/api db:migrate
pnpm --filter @kimthanh/api db:seed
pnpm dev
```

Seeded accounts (password `Password123`):

- `admin@kimthanh.school` (SUPER_ADMIN)
- `teacher@kimthanh.school` (TEACHER)
- `parent@kimthanh.school` (PARENT)

## Documentation

**Start with [`docs/ai-context/project-summary.md`](./docs/ai-context/project-summary.md)** — a single-page
overview written for both human engineers and AI agents extending the system.

| Topic | Where |
|---|---|
| System map | [`docs/architecture/overview.md`](./docs/architecture/overview.md) |
| Conventions | [`docs/conventions/`](./docs/conventions) |
| Business domains | [`docs/product/`](./docs/product) |
| Setup / deploy | [`docs/setup/`](./docs/setup) |
| Decisions (ADRs) | [`docs/decisions/`](./docs/decisions) |
| AI extension guide | [`docs/ai-context/extension-guide.md`](./docs/ai-context/extension-guide.md) |

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Next.js 14 App Router + next-intl + Tailwind |
| Mobile | Expo SDK 51 + React Navigation + NativeWind + i18next |
| API | NestJS 10 + Prisma 5 + PostgreSQL 15 |
| Auth | JWT (access 15m + rotating refresh 30d) |
| Validation | Zod (shared between FE + BE) |
| State (server) | TanStack Query |
| State (auth) | Zustand (shared package) |
| i18n | Default user language Vietnamese; codebase English |

## Scripts (root)

| Script | Effect |
|---|---|
| `pnpm dev` | Run all apps in dev mode (turbo). |
| `pnpm build` | Build every workspace. |
| `pnpm lint` | ESLint everywhere. |
| `pnpm typecheck` | `tsc --noEmit` everywhere. |
| `pnpm test` | Run all test suites. |
| `pnpm format` | Prettier write. |

## License

UNLICENSED — proprietary. Internal use only.
