# Shared Packages

## `@kimthanh/shared-types`

Pure types/enums. Zero runtime cost (no exports with side effects). Contains:

- `enums.ts` — `UserRole`, `UserStatus`, `Gender`, `AttendanceStatus`,
  `MedicineRequestStatus`, `PaymentStatus`, `AnnouncementAudience`, `MediaType`, `Locale`.
- `common.ts` — `ApiResponse<T>` envelope, `Paginated<T>`, `PaginationQuery`,
  `Timestamped`, `SoftDeletable`, `ID`.
- `auth.ts` — `LoginRequest`, `LoginResponse`, `AuthTokens`, `JwtPayload`.
- `user.ts`, `school.ts`, `student.ts`, `attendance.ts`, `report.ts`, `health.ts`,
  `finance.ts`, `announcement.ts`, `media.ts`, `i18n.ts`.

## `@kimthanh/shared-utils`

Cross-platform utilities.

- `schemas.ts` — Zod schemas for every request body the API accepts.
- `validators.ts`, `formatters.ts`, `date.ts`, `constants.ts`, `guards.ts`.

## `@kimthanh/shared-api-client`

- `ApiClient` — Axios wrapper with auth + locale headers + 401 refresh-and-retry.
- `TokenStorage` interface + `MemoryTokenStorage`.
- `createApiSdk(api)` — assembles all endpoint groups into a typed `ApiSdk`.
- `ApiClientError`.

The SDK is the **only** way frontends should talk to the API.

## `@kimthanh/shared-auth`

- `useAuthStore` (Zustand) — `user`, `tokens`, `isAuthenticated`, `isHydrating`.
- `useAuth({ sdk, storage })` — `login`, `register`, `logout`, `hydrate`.
- `Permissions` catalog + `ROLE_PERMISSIONS` + `hasPermission` / `hasAnyPermission`.

## `@kimthanh/shared-ui`

- `tokens.ts` — design tokens consumed by both Tailwind configs.
- `web/` — `Button`, `Card`, `Badge`, `Spinner`, `EmptyState` (Tailwind).
- `native/` — `Button`, `Card`, `Badge` (NativeWind).

Two entry subpaths (`/web`, `/native`) keep platform-specific deps tree-shakable.

## Adding to a shared package

Update both the file and `src/index.ts` re-exports. Bump no version — workspace deps
use `workspace:*`.
