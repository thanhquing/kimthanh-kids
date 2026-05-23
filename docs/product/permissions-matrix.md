# Permissions Matrix

Source of truth: `packages/shared-auth/src/rbac.ts`. This page mirrors it for humans.

| Permission | SUPER_ADMIN | ADMIN | FINANCE | NURSE | TEACHER | PARENT |
|---|---|---|---|---|---|---|
| `student:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own children) |
| `student:write` | ✅ | ✅ | — | — | — | — |
| `student:delete` | ✅ | ✅ | — | — | — | — |
| `attendance:read` | ✅ | ✅ | — | — | ✅ | ✅ (own children) |
| `attendance:write` | ✅ | ✅ | — | — | ✅ | — |
| `report:read` | ✅ | ✅ | — | — | ✅ | ✅ (own children) |
| `report:write` | ✅ | ✅ | — | — | ✅ | — |
| `health:read` | ✅ | ✅ | — | ✅ | — | — |
| `health:write` | ✅ | — | — | ✅ | — | — |
| `health:medicine:approve` | ✅ | — | — | ✅ | — | — |
| `finance:invoice:read` | ✅ | ✅ | ✅ | — | — | ✅ (own children) |
| `finance:invoice:write` | ✅ | ✅ | ✅ | — | — | — |
| `finance:payment:record` | ✅ | — | ✅ | — | — | — |
| `announcement:read` | ✅ | ✅ | — | — | ✅ | ✅ |
| `announcement:write` | ✅ | ✅ | — | — | — | — |
| `user:manage` | ✅ | ✅ | — | — | — | — |
| `school:manage` | ✅ | ✅ | — | — | — | — |

Record-level scoping (e.g. parent sees only own children, teacher sees only own class)
is enforced in services even when the role permission grants read access.
