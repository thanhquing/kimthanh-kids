# Backend Architecture

## Stack

- **NestJS 10** — modular, decorator-based DI.
- **Prisma** ORM over **PostgreSQL**.
- **Passport JWT** strategy for access tokens.
- **Zod** for request validation (via `ZodValidationPipe`).
- **class-validator** for DTO classes where it reads better than Zod.
- **nestjs-i18n** for localized error messages.
- **Helmet** + **CORS** + **ThrottlerModule** for baseline hardening.

## Module layout

Each domain module owns:
- `<module>.module.ts`
- `<module>.controller.ts` — REST endpoints with `@Roles` guards.
- `<module>.service.ts` — business logic + Prisma access.
- `dto/` (optional) — request DTOs.

The `PrismaModule` is `@Global()` so domain modules don't redeclare it.

## Request lifecycle

```
Client → CORS / Helmet
       → ThrottlerGuard (rate limit)
       → JwtAuthGuard  (validates Bearer; @Public bypasses)
       → RolesGuard    (checks @Roles metadata)
       → ValidationPipe (class-validator)
       → ZodValidationPipe (route-scoped)
       → Controller → Service → Prisma
       → TransformInterceptor (wraps in ApiSuccess<T>)
       → AllExceptionsFilter (on error, wraps in ApiError)
```

## Response envelope

```ts
type ApiResponse<T> =
  | { success: true; data: T; meta?: PaginationMeta }
  | { success: false; error: { code, message, messageKey?, details? } }
```

The SDK on the client side unwraps `data` (or throws `ApiClientError`) automatically.

## Authorization

- Route-level: `@Roles(UserRole.TEACHER, …)` on controllers.
- Record-level: services scope queries by `actor.schoolId` and, for `PARENT`, by
  `student.parents.some.parentId`. Never trust an `:id` parameter without scoping.
- UI-level: `hasPermission(role, Permissions.X)` from `@kimthanh/shared-auth`.

## Adding a new endpoint

1. Add a method to the module's service.
2. Add a route to the controller with `@Roles` if restricted.
3. Validate input with `ZodValidationPipe(<schema>)` from `@kimthanh/shared-utils`.
4. Add the typed wrapper to `packages/shared-api-client/src/endpoints.ts`.

## Logging

- Default Nest logger (replace with `nest-winston` in production).
- `AllExceptionsFilter` logs 5xx with stack traces; 4xx logged at `warn`.
- **Never** log tokens, passwords, or PII.
