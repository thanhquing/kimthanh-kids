# Authorization & RBAC

## Roles

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Platform owner. Crosses tenant boundaries. |
| `ADMIN` | School administrator. Tenant-scoped. |
| `FINANCE` | Manages invoices, payments. |
| `NURSE` | Manages health records, medicine approvals. |
| `TEACHER` | Manages a classroom: attendance, daily reports, media. |
| `PARENT` | Read-only on their own children + tuition + announcements. |

## Permission catalog

Defined in `packages/shared-auth/src/rbac.ts`. Examples:

- `student:read`, `student:write`, `student:delete`
- `attendance:read`, `attendance:write`
- `health:medicine:approve`
- `finance:invoice:read`, `finance:invoice:write`, `finance:payment:record`
- `announcement:write`
- `user:manage`, `school:manage`

`ROLE_PERMISSIONS` maps each role to its permission list. `SUPER_ADMIN` gets all.

## Three layers of enforcement

1. **Route guards** (backend): `@Roles(UserRole.X, …)` + `RolesGuard`.
2. **Record scoping** (backend): services filter Prisma queries by `actor.schoolId`,
   and for parents by `student.parents.some.parentId`.
3. **UI gating** (frontend): `hasPermission(role, Permissions.X)` controls links,
   buttons, menus.

## Example

```ts
// Controller
@Post()
@Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UsePipes(new ZodValidationPipe(markAttendanceSchema))
mark(@CurrentUser() user, @Body() body) {
  return this.attendance.mark(user.sub, body);
}

// Service (record scoping example, students)
if (actor.role === UserRole.PARENT) {
  where.parents = { some: { parentId: actor.sub } };
} else if (actor.schoolId) {
  where.schoolId = actor.schoolId;
}
```

## Auditing

Future: an `audit_logs` table will record every write action with `{actor, action, target, before, after}`.
