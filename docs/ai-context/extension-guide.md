# Extension Guide

How to extend the system without breaking invariants.

## Add a new entity (e.g. `MealPlan`)

1. **Prisma**: add the model to `apps/api/prisma/schema.prisma`. Include UUID PK,
   `createdAt`, `updatedAt`, `schoolId` (if tenant-scoped), and indexes.
2. **Migrate**: `pnpm --filter @kimthanh/api db:migrate`.
3. **DTO**: add `MealPlanDTO` (and create/update payload types) to
   `packages/shared-types/src/meal-plan.ts`; re-export from `src/index.ts`.
4. **Zod**: add `createMealPlanSchema` to `packages/shared-utils/src/schemas.ts`.
5. **API module**: create `apps/api/src/modules/meal-plans/` with module + service +
   controller. Register in `app.module.ts`.
6. **SDK**: add `createMealPlanEndpoints(api)` to
   `packages/shared-api-client/src/endpoints.ts` and include it in `createApiSdk`.
7. **RBAC**: add `MEAL_PLAN_READ` / `MEAL_PLAN_WRITE` to
   `packages/shared-auth/src/rbac.ts` and assign to roles.
8. **UI**: add screens/pages in `apps/web` and/or `apps/mobile`.
9. **i18n**: add translation keys to all `locales/{vi,en}/common.json` files.

## Add a new role

1. Add to `UserRole` enum in `packages/shared-types/src/enums.ts` AND `schema.prisma`.
2. Add a permission set to `ROLE_PERMISSIONS` in `shared-auth/src/rbac.ts`.
3. Decide which navigator (mobile) or layout (web) it routes to.
4. Add seed user if useful (`apps/api/prisma/seed.ts`).

## Add a new language

1. Add the language code to `Locale` enum in `shared-types/src/enums.ts`.
2. Add a Prisma enum value.
3. Create `apps/web/locales/<code>/common.json` and `apps/mobile/locales/<code>/common.json`.
4. Update `apps/web/src/i18n/config.ts` `locales` array.
5. Add a backend locale file under `apps/api/src/modules/i18n/locales/<code>/`.

## Add a new permission

Only edit `packages/shared-auth/src/rbac.ts`. The backend's `@Roles` decorator continues
to gate by role; for fine-grained checks use `hasPermission(role, Permissions.X)` in
service code or UI conditionals.
