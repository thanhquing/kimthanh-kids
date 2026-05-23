# Frontend (Web) Architecture

## Stack

- **Next.js 14 App Router** — Server Components by default, client components opt-in.
- **next-intl** — i18n with `[locale]` segment + middleware-based locale detection.
- **TailwindCSS** with shared design tokens from `@kimthanh/shared-ui/tokens`.
- **TanStack Query** — server-state cache for API data.
- **Zustand** (via `@kimthanh/shared-auth`) — auth state.
- **next-themes** — light/dark theme.

## Routing

```
src/app/[locale]/
  layout.tsx                  Root locale-aware shell, providers, i18n provider
  page.tsx                    Marketing landing
  (auth)/
    login/page.tsx            Login form
  (dashboard)/
    layout.tsx                Sidebar + nav, role-aware links
    admin/page.tsx
    finance/page.tsx
    nurse/page.tsx
```

Route groups in parentheses (`(auth)`, `(dashboard)`) do not affect URLs — they enable
distinct layouts for distinct sections.

## Data flow

UI → `apiSdk.<group>.<method>(…)` (typed) → `ApiClient` (axios + interceptors) → API.

Auth tokens are stored in `localStorage` via `browserStorage`. The `ApiClient`
interceptor refreshes access tokens on 401 and retries the original request once.

## i18n

- `apps/web/locales/{vi,en}/common.json` are the only place UI strings live.
- Server Components: `getTranslations(namespace)` from `next-intl/server`.
- Client Components: `useTranslations(namespace)`.
- Switching language: `LanguageSwitcher` rewrites the first path segment.

## Theming

- Light/dark managed by `next-themes` (`class` strategy).
- Brand colors come from `@kimthanh/shared-ui/tokens`.

## Adding a new dashboard page

1. Create `apps/web/src/app/[locale]/(dashboard)/<area>/page.tsx`.
2. Use `getTranslations` (server) or `useTranslations` (client) — never inline strings.
3. Add nav link to `apps/web/src/app/[locale]/(dashboard)/layout.tsx`.
4. Gate the link with `hasPermission(role, Permissions.X)` if role-restricted.
