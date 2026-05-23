# Monorepo Structure

```
kimthanh-kids/
├── apps/
│   ├── api/        NestJS REST API + Prisma
│   ├── web/        Next.js 14 (marketing + admin dashboards)
│   └── mobile/     Expo React Native (parent + teacher apps)
├── packages/
│   ├── shared-types/        Enums, DTOs, ApiResponse envelope, JWT types
│   ├── shared-utils/        Zod schemas, formatters, date utils, constants
│   ├── shared-api-client/   ApiClient, TokenStorage, typed ApiSdk
│   ├── shared-auth/         Auth store (Zustand), useAuth hook, RBAC catalog
│   └── shared-ui/           Tokens + web/native UI primitives
├── tooling/
│   ├── eslint-config/       Shared ESLint configs
│   └── tsconfig/            Shared tsconfig bases
├── docs/                    This documentation
├── assets/                  Logo / images / videos / icons placeholders
├── .github/workflows/       CI pipelines
├── package.json             Workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig (per app/package, extending tooling/tsconfig)
```

## Dependency direction

```
apps/*   ──► packages/*
apps/web ──► apps/api (only via HTTP, never via import)
apps/mobile ──► apps/api (only via HTTP, never via import)
packages/* MUST NOT depend on apps/*.
```

## Why this layout

- **Apps** are deployables. Each has a single responsibility (web SPA, mobile app, API).
- **Packages** are libraries — every shared concern lives here, exactly once.
- **Tooling** centralizes config that would otherwise drift.

## Turborepo pipeline

`turbo.json` defines `build`, `dev`, `lint`, `test`, `typecheck`, `clean`,
`db:generate`, `db:migrate`. Pipelines respect `^build` so packages build before apps.

## Adding a new workspace

1. Create the folder under `apps/` or `packages/`.
2. Add a `package.json` with `"name": "@kimthanh/<slug>"`, `"private": true`,
   `"workspaces:*"` deps where needed.
3. Add a `tsconfig.json` extending the relevant `tooling/tsconfig` base.
4. Add to `pnpm-workspace.yaml` if a new top-level folder.
