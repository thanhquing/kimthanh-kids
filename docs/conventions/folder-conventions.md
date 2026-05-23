# Folder Conventions

## NestJS (`apps/api`)

```
src/
  common/         Cross-cutting (decorators, filters, interceptors, pipes)
  config/         Env + config schema
  modules/
    <domain>/
      dto/        Optional — request DTOs
      <domain>.module.ts
      <domain>.service.ts
      <domain>.controller.ts
  main.ts
  app.module.ts
```

## Next.js (`apps/web`)

```
src/
  app/
    [locale]/
      (marketing) | (auth) | (dashboard)/
  components/     Shared UI for the web app
  features/      <domain>/ feature folders for non-trivial flows
  lib/            apiClient, helpers
  i18n/           config + request resolver
  middleware.ts
locales/{vi,en}/common.json
```

## Expo (`apps/mobile`)

```
src/
  navigation/     RootNavigator, role navigators
  screens/<role>/<screen>.tsx
  components/     mobile-specific shared UI
  lib/            apiClient
  i18n/
locales/{vi,en}/common.json
```

## packages

```
packages/<name>/src/
  index.ts        Public re-exports
  ...one file per concern...
```

## Feature-folder pattern (for `apps/web/src/features/<x>`)

```
features/student-detail/
  components/
  hooks/
  queries.ts       TanStack Query hooks
  schemas.ts       Zod schemas local to this feature
  index.ts         Public surface for this feature
```
