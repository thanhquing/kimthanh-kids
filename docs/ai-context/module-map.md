# Module Map

Cheat sheet for which file owns which concern. Use this before searching.

## apps/api (NestJS)

| Concern | Path |
|---|---|
| Entrypoint | `apps/api/src/main.ts` |
| Root module | `apps/api/src/app.module.ts` |
| Env config + validation | `apps/api/src/config/config.schema.ts` |
| Global error filter | `apps/api/src/common/filters/all-exceptions.filter.ts` |
| Response envelope | `apps/api/src/common/interceptors/transform.interceptor.ts` |
| Zod validation pipe | `apps/api/src/common/pipes/zod-validation.pipe.ts` |
| Current user decorator | `apps/api/src/common/decorators/current-user.decorator.ts` |
| `@Roles` / `@Public` | `apps/api/src/common/decorators/roles.decorator.ts` |
| Prisma service | `apps/api/src/modules/prisma/` |
| Auth (login, refresh, JWT) | `apps/api/src/modules/auth/` |
| Users | `apps/api/src/modules/users/` |
| Students | `apps/api/src/modules/students/` |
| Classrooms | `apps/api/src/modules/classrooms/` |
| Attendance | `apps/api/src/modules/attendance/` |
| Daily reports | `apps/api/src/modules/reports/` |
| Health (medicine, records, incidents) | `apps/api/src/modules/health/` |
| Finance (invoices, payments) | `apps/api/src/modules/finance/` |
| Announcements | `apps/api/src/modules/announcements/` |
| Media (placeholder for S3) | `apps/api/src/modules/media/` |
| i18n (vi/en error messages) | `apps/api/src/modules/i18n/` |
| DB schema | `apps/api/prisma/schema.prisma` |
| DB seed | `apps/api/prisma/seed.ts` |

## apps/web (Next.js 14)

| Concern | Path |
|---|---|
| App router root | `apps/web/src/app/[locale]/layout.tsx` |
| Marketing landing | `apps/web/src/app/[locale]/page.tsx` |
| Login | `apps/web/src/app/[locale]/(auth)/login/page.tsx` |
| Admin dashboard | `apps/web/src/app/[locale]/(dashboard)/admin/` |
| Finance dashboard | `apps/web/src/app/[locale]/(dashboard)/finance/` |
| Nurse dashboard | `apps/web/src/app/[locale]/(dashboard)/nurse/` |
| Providers (RQ, theme) | `apps/web/src/components/providers.tsx` |
| Language switcher | `apps/web/src/components/language-switcher.tsx` |
| API client (browser) | `apps/web/src/lib/api-client.ts` |
| i18n config | `apps/web/src/i18n/` and `apps/web/locales/{vi,en}/common.json` |
| Locale middleware | `apps/web/src/middleware.ts` |
| Tailwind config | `apps/web/tailwind.config.ts` |

## apps/mobile (Expo)

| Concern | Path |
|---|---|
| Entry | `apps/mobile/App.tsx` |
| Root navigator (role-based) | `apps/mobile/src/navigation/root-navigator.tsx` |
| Parent navigator | `apps/mobile/src/navigation/parent-navigator.tsx` |
| Teacher navigator | `apps/mobile/src/navigation/teacher-navigator.tsx` |
| Login | `apps/mobile/src/screens/auth/login-screen.tsx` |
| Parent screens | `apps/mobile/src/screens/parent/` |
| Teacher screens | `apps/mobile/src/screens/teacher/` |
| API client (SecureStore) | `apps/mobile/src/lib/api-client.ts` |
| i18n init | `apps/mobile/src/i18n/index.ts` |
| Locales | `apps/mobile/locales/{vi,en}/common.json` |

## packages

| Package | Owns |
|---|---|
| `@kimthanh/shared-types` | Enums, DTOs, `ApiResponse<T>`, JWT payload, i18n types |
| `@kimthanh/shared-utils` | Zod schemas, formatters, date utils, constants, type guards |
| `@kimthanh/shared-api-client` | `ApiClient`, `TokenStorage`, `ApiSdk` endpoint groups |
| `@kimthanh/shared-auth` | `useAuthStore`, `useAuth` hook, `Permissions` + `hasPermission` |
| `@kimthanh/shared-ui` | Design tokens, web (Tailwind) + native (NativeWind) primitives |
