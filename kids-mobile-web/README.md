# kids-mobile-web

Mobile web/PWA của KimThanh Kids cho 2 role chính: phụ huynh và giáo viên.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS, token/component class port từ `kids-landing/public/mock-ui/shared.css`
- `lucide-react` cho icon, `@fontsource/be-vietnam-pro` cho font offline
- `cn` utility theo shadcn/ui convention (`clsx` + `tailwind-merge`)
- SPA/PWA shell: `manifest.webmanifest`, service worker cache app shell khi build production
- Mock data trong `src/mockData.ts`, chưa gọi API

## Cấu trúc

- `src/App.tsx`: route map giống convention `kids-platform`
- `src/components/ui`: common UI nhỏ như Field, Toast, BottomSheet
- `src/components/mobile`: phone shell, tab bar, top bar, mobile primitives
- `src/pages/auth`: login/reset-password
- `src/pages/parent`: màn phụ huynh
- `src/pages/teacher`: màn giáo viên
- `src/pages/shared`: màn dùng chung 2 role
- `src/lib`: state context, routes, utils

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

Xem [MOBILE_WEB_TASKS.md](./MOBILE_WEB_TASKS.md) để biết trạng thái việc đã làm và phần còn lại.
