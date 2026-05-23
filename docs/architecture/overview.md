# System Overview

```
                ┌─────────────────────────┐
                │       Parents / Staff   │
                └────────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼─────┐  ┌─────▼─────┐  ┌────▼────────┐
       │ apps/web   │  │ apps/web  │  │ apps/mobile │
       │ marketing  │  │ dashboard │  │ Expo RN     │
       │ (Next.js)  │  │ (Next.js) │  │ Teacher +   │
       │            │  │ Admin /   │  │ Parent      │
       │            │  │ Finance / │  │             │
       │            │  │ Nurse     │  │             │
       └──────┬─────┘  └─────┬─────┘  └─────┬───────┘
              │              │              │
              └────────────┬─┴──────────────┘
                           │
                  @kimthanh/shared-api-client (typed SDK)
                           │
                  HTTPS / JSON / JWT Bearer
                           │
                ┌──────────▼──────────┐
                │     apps/api        │
                │     NestJS REST     │
                │ ┌─────────────────┐ │
                │ │ Auth (JWT+RBAC) │ │
                │ │ Users           │ │
                │ │ Students        │ │
                │ │ Classrooms      │ │
                │ │ Attendance      │ │
                │ │ DailyReports    │ │
                │ │ Health          │ │
                │ │ Finance         │ │
                │ │ Announcements   │ │
                │ │ Media (S3)      │ │
                │ └────────┬────────┘ │
                │   Prisma ORM        │
                └──────────┬──────────┘
                           │
                  ┌────────▼─────────┐
                  │   PostgreSQL     │
                  └──────────────────┘
```

## Principles

- **Single source of truth for contracts**: enums, DTOs, API envelope, and Zod schemas
  live in `packages/shared-*`. Apps consume them; nobody redeclares them.
- **Multi-tenant by `schoolId`**: every tenant table is scoped to a school. Future
  multi-campus is supported.
- **Stateless API + rotated refresh tokens**: horizontal scaling friendly. Refresh
  tokens are persisted as hashes for revocation/audit.
- **i18n is built-in**, not a retrofit. API errors carry a `messageKey`; UI translates.
- **Strict types everywhere**, no `any`.

See:

- [`monorepo-structure.md`](./monorepo-structure.md)
- [`authentication-flow.md`](./authentication-flow.md)
- [`authorization-rbac.md`](./authorization-rbac.md)
- [`database-design.md`](./database-design.md)
- [`api-design.md`](./api-design.md)
