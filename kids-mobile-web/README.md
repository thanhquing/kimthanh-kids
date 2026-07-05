# kids-mobile-web

Mobile web/PWA của KimThanh Kids cho 2 role chính: phụ huynh và giáo viên.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS, token/component class port từ `kids-landing/public/mock-ui/shared.css`
- `lucide-react` cho icon, `@fontsource/be-vietnam-pro` cho font offline
- `cn` utility theo shadcn/ui convention (`clsx` + `tailwind-merge`)
- SPA/PWA shell: `manifest.webmanifest`, service worker cache app shell/static assets khi build production; bỏ qua `/api/*` và request có `Authorization` để không giữ dữ liệu nhạy cảm giữa tài khoản
- Data: **gọi API thật kids-api** qua `src/api/*` (react-query, mirror `kids-platform`); `src/api/http.ts` xử lý envelope + refresh 401 + `x-language`. `src/mockData.ts` chỉ còn `assets` (ảnh tĩnh)
- Đa ngôn ngữ VI/EN: `src/lib/language.ts` + `src/i18n` (`useT`), switcher ở Login/Profile

## Cấu trúc

- `src/App.tsx`: route map giống convention `kids-platform`
- `src/components/ui`: common UI nhỏ như Field, Toast, BottomSheet
- `src/components/mobile`: phone shell, tab bar, top bar, mobile primitives
- `src/pages/auth`: login/reset-password
- `src/pages/parent`: màn phụ huynh
- `src/pages/teacher`: màn giáo viên
- `src/pages/shared`: màn dùng chung 2 role
- `src/api`: client HTTP + module theo domain (auth, students, attendance, reports, medicine, health, tuition, leave, announcements, notifications, menus, lessonPlans, albums) — react-query hooks
- `src/i18n`, `src/lib`: i18n VI/EN, language store, routes, utils, display helpers

## Chạy local

```bash
pnpm install
pnpm dev
```

App chạy mặc định ở `http://localhost:5176`.

## Build

```bash
pnpm build
```

## Handoff

- [MOBILE_WEB_TASKS.md](./MOBILE_WEB_TASKS.md) — trạng thái tổng việc đã làm / còn lại
- [API_INTEGRATION_TASKS.md](./API_INTEGRATION_TASKS.md) — chi tiết integrate API từng domain + cURL + review
- [FE_TEST_SCENARIOS.md](./FE_TEST_SCENARIOS.md) — kịch bản chức năng làm cơ sở e2e FE
- [../kids-crm/CRM_FEATURE_IDEAS.md](../kids-crm/CRM_FEATURE_IDEAS.md) — ý tưởng CRM tương quan mobile theo role
