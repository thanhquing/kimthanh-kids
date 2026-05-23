# Project Summary (read this first)

KimThanh Kindergarten is a **multi-platform management ecosystem** for a kindergarten:
marketing site + admin dashboard (web), parent + teacher app (mobile), and a central
backend API. It is a **pnpm + Turborepo monorepo** in strict TypeScript.

## One-paragraph mental model

A NestJS API (Prisma + PostgreSQL) is the system of record. A Next.js 14 web app serves
the marketing landing page **and** role-based admin/finance/nurse dashboards. An Expo
React Native app serves parents and teachers. All clients talk to the API via a single
typed SDK shipped from `packages/shared-api-client`. Authentication is JWT (access +
refresh). Authorization is role-based via a permission catalog in `packages/shared-auth`.
All user-facing strings are translatable — **default user-facing language is Vietnamese**,
codebase language is English.

## Workspaces

```
apps/
  api/       NestJS backend (REST, Prisma, PostgreSQL, JWT, RBAC)
  web/       Next.js 14 App Router (next-intl, TailwindCSS)
  mobile/    Expo SDK 51 + React Navigation (i18next, NativeWind)

packages/
  shared-types/        DTOs, enums, API envelope types
  shared-utils/        Zod schemas, formatters, date utils, constants, guards
  shared-api-client/   Axios-based ApiClient + typed endpoint groups (ApiSdk)
  shared-auth/         Zustand auth store, useAuth hook, RBAC permission catalog
  shared-ui/           Design tokens + web (Tailwind) and native (NativeWind) primitives

tooling/
  eslint-config/       Shared ESLint configs (base, next, react-native, nest)
  tsconfig/            Shared tsconfig bases (base, nextjs, nestjs, react-native)
```

## Key invariants (do not violate)

- **Strict TypeScript** — no `any` without justification.
- **No hardcoded UI strings.** Always go through `t('…')`. Locales live in
  `apps/*/locales/{vi,en}`.
- **Default locale = `vi`** for end users. Codebase language is English.
- **Enums are duplicated in three places by design**: Prisma schema, `shared-types/enums.ts`,
  and Zod validators. Keep them in sync.
- **API responses always use the `ApiResponse<T>` envelope** (`{ success, data | error }`).
  The web SDK unwraps this automatically.
- **Authorization happens in three layers**: route-level (`@Roles`), record-level
  (scoping in service queries, e.g. parents only see their own students), permission
  catalog (UI gating).
- **Multi-tenant by `schoolId`.** Services must scope queries by `actor.schoolId` unless
  the actor is `SUPER_ADMIN`.

## Where to look when…

| Task | Start here |
|---|---|
| Add a new entity | `apps/api/prisma/schema.prisma` → migration → DTO in `shared-types` → service + controller |
| Add a new API endpoint | Add to a NestJS module + `packages/shared-api-client/src/endpoints.ts` |
| Add a new role permission | `packages/shared-auth/src/rbac.ts` |
| Add a new UI string | `apps/<app>/locales/{vi,en}/common.json` |
| Add a new ADR | `docs/decisions/NNNN-title.md` |
