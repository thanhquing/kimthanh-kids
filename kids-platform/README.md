# kids-platform

Console quản trị **nền tảng** (chủ KimThanh Kids) — host `admin.kimthanhkids.vn`.
React + Vite + TypeScript + Tailwind, dùng design system port từ `kids-landing/public/mock-ui` (giống 100% mock).

## Chạy dev

```bash
pnpm install
pnpm gen:api      # sinh type từ ../kids-api/openapi.json → src/api/generated/
pnpm dev          # http://localhost:5174
```

Cần kids-api chạy ở `:3000` (`cd ../kids-api && pnpm db:up && pnpm start:dev`).
Dev gọi `/api/*` → **Vite proxy** sang `:3000` và set `Host: admin.kimthanhkids.vn`
(không cần `/etc/hosts`, không vướng CORS). Đăng nhập: `admin@kimthanhkids.vn / Admin@12345`.

## Build production

```bash
pnpm build        # → dist/ (tĩnh) → nginx phục vụ tại admin.kimthanhkids.vn
```

Prod: nginx reverse-proxy `/api` → kids-api, set `Host admin.kimthanhkids.vn`.

## Cấu trúc

- `src/api/http.ts` — lớp HTTP chung (bóc envelope, auth, 401→refresh). **File mẫu** để CRM/mobile copy.
- `src/api/generated/` — type sinh từ OpenAPI (gitignore, chạy `pnpm gen:api`).
- `src/components/` `src/pages/` — UI theo mock-ui/platform.
- `src/index.css` — token + component classes port từ `shared.css`.
