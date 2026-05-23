# NestJS Guidelines

- One module per domain. Module = controller + service (+ sub-services).
- Services own business logic and Prisma access. Controllers stay thin.
- Use `PrismaService` (global). Do not instantiate `PrismaClient` directly.
- Validate every body with `ZodValidationPipe` or `ValidationPipe` (class-validator).
- Use `@Roles(...)` for route guards. Add record-level scoping in the service.
- Throw `HttpException` subclasses with structured bodies:

  ```ts
  throw new ForbiddenException({ code: 'FORBIDDEN', messageKey: 'errors.forbidden' });
  ```

- Pagination: accept `page`, `pageSize` via `DefaultValuePipe + ParseIntPipe`. Cap at
  `MAX_PAGE_SIZE = 100` (`shared-utils/constants.ts`).
- Never call `process.env` directly inside services — go through `ConfigService` so
  `config.schema.ts` (Zod) keeps the contract validated.
