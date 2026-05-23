# Mobile Architecture

## Stack

- **Expo SDK 51** + **React Native 0.74**.
- **React Navigation v6** — `RootNavigator` chooses Parent vs Teacher stack at runtime.
- **NativeWind** for Tailwind-style class names.
- **i18next + expo-localization** — i18n with device-language detection, Vietnamese fallback.
- **TanStack Query** for server state.
- **Zustand** (via `@kimthanh/shared-auth`) for auth.
- **expo-secure-store** for JWT storage.

## Navigation

```
RootNavigator
 ├── if !isAuthenticated → Login stack
 ├── if role === PARENT  → ParentNavigator (bottom tabs)
 └── otherwise           → TeacherNavigator (bottom tabs)
```

`RootNavigator` re-renders when `useAuthStore` updates — login automatically redirects.

## Data flow

UI → `apiSdk.<group>.<method>(…)` → `ApiClient` (axios + interceptors) → API.
Tokens persist in `expo-secure-store`. `App.tsx` calls `auth.hydrate()` on boot.

## i18n

- Locale JSON at `apps/mobile/locales/{vi,en}/common.json`.
- Initialized in `src/i18n/index.ts` — device language is detected via
  `expo-localization`, falling back to Vietnamese.
- Components: `const { t } = useTranslation(); t('parent.dashboard')`.

## Adding a new screen

1. Add file under `src/screens/<role>/<screen-name>.tsx`.
2. Register in the relevant navigator (`parent-navigator.tsx` or `teacher-navigator.tsx`).
3. Use `useTranslation` — never inline strings.
4. Add new translation keys to **both** `vi/common.json` and `en/common.json`.
