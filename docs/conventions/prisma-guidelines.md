# Prisma Guidelines

- UUID PKs: `@id @default(uuid())`.
- Timestamps: `createdAt @default(now())` + `updatedAt @updatedAt`.
- Soft delete: nullable `deletedAt` on aggregates; always include `deletedAt: null`
  in `where` clauses (or use a Prisma middleware later).
- `schoolId` is required on every tenant table and indexed.
- Index composite read paths (e.g. `(classroomId, date)`).
- Snake_case table names via `@@map`. PascalCase model names.
- Decimal for money: `Decimal @db.Decimal(12, 2)` — never `Float`.
- Run `prisma format` before committing schema changes.
- Migrations are checked in. Name them descriptively: `add_medicine_request_table`.

## Anti-patterns

- ❌ `prisma.user.findMany()` without `where: { deletedAt: null }` on soft-delete tables.
- ❌ `Float` for money.
- ❌ Hard-coded SQL via `$queryRaw` unless absolutely necessary (Prisma can't express it).
- ❌ Returning Prisma models directly from controllers — always map to a DTO.
