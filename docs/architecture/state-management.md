# State Management

## Categories

| Kind | Tool |
|---|---|
| Server state (lists, details, mutations) | **TanStack Query** |
| Auth (user, tokens, hydration) | **Zustand** via `@kimthanh/shared-auth` |
| Theme (web) | **next-themes** |
| Form state | Component-local `useState` for simple forms; **react-hook-form** when needed |
| Locale (web) | **next-intl** (URL-driven) |
| Locale (mobile) | **i18next** + device detection |

## Rules

- **Do not put server data in Zustand.** Use TanStack Query.
- **Do not duplicate the `user` object** across stores. Read it from `useAuthStore`.
- **No global event bus.** Cross-component reactions go through TanStack Query
  invalidation or a typed Zustand slice.

## Cache keys

Convention: `['<resource>', <scope>, <filters>]`. Examples:

```ts
['students', schoolId, { classroomId }]
['attendance', classroomId, date]
['invoices', { studentId, status }]
```

## Hydration

- Web: TanStack Query Provider in `components/providers.tsx`. No SSR hydration of
  user-specific data (auth is client-side `localStorage`).
- Mobile: `App.tsx` calls `auth.hydrate()` before mounting navigators.
