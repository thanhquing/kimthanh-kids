# Database Design

PostgreSQL with Prisma. UUID primary keys, `createdAt` / `updatedAt`, soft delete via
`deletedAt` where applicable. Multi-tenant by `schoolId`.

## Core tables

| Table | Purpose |
|---|---|
| `schools` | Tenant root. |
| `users` | All identities — roles encoded in `users.role`. |
| `refresh_tokens` | Hashed refresh JWTs, for rotation + revocation. |
| `classrooms` | Tenant-scoped, optional `homeroomTeacherId`. |
| `students` | Tenant-scoped. Linked to `classrooms` and to `users` via `student_parents`. |
| `student_parents` | M2M between `students` and parent `users`. Optional `relationship`, `isPrimary`. |
| `attendance` | Unique `(studentId, date)`. Indexed on `(classroomId, date)`. |
| `daily_reports` | Unique `(studentId, date)`. M2M with `media` via `media_reports`. |
| `medicine_requests` | Indexed on `(studentId, status)`. |
| `health_records` | Height/weight/temperature timeseries. |
| `incidents` | Injuries / events with `severity`. |
| `tuition_invoices` | Unique `(studentId, period)`. Indexed on `(schoolId, status)`. |
| `payments` | Links to `tuition_invoices`. |
| `announcements` | Tenant + audience scope. |
| `media` | Uploaded files (image/video/document). |
| `media_students`, `media_reports` | M2M join tables. |

## Indexing rules

- Every tenant table is indexed on `schoolId`.
- Time-bucketed queries (attendance by class+date, invoices by school+status) have
  composite indexes.
- M2M tables use composite primary keys (`@@id([...])`).

## Soft delete

`schools`, `users`, `classrooms`, `students` have `deletedAt`. Hard delete is
permitted for ephemeral child rows (`refresh_tokens`, `media_*` joins).

## Migrations

```
pnpm --filter @kimthanh/api db:migrate     # dev
pnpm --filter @kimthanh/api db:deploy      # production
pnpm --filter @kimthanh/api db:seed
```

Never use `prisma db push` against production.

## Enum sync

Prisma enums must mirror `packages/shared-types/src/enums.ts`. Adding a value
requires a migration (Postgres `ALTER TYPE … ADD VALUE`).
