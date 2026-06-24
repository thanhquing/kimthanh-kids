# Phát triển — workspace tiện ích (KHÔNG phải monorepo)

> Mỗi app FE **độc lập** (cài/deps/deploy riêng). File `package.json` ở gốc chỉ là **bộ script tiện ích** để gọi nhanh + **sinh api-client chung** từ OpenAPI rồi copy vào từng app. Không pnpm workspace, không Turborepo.

## Sơ đồ

```
kimthanh-kids/
├── package.json          # script tiện ích (root)
├── scripts/gen-api.mjs   # sinh type chung + copy vào từng app
├── api-client/generated/ # type CHUNG sinh ra (nguồn để copy) — gitignore
├── kids-api/
│   └── openapi.json      # ✅ COMMIT — nguồn type (sinh bằng `pnpm openapi:json`)
├── kids-platform/ kids-crm/ kids-mobile-native/ kids-mobile-web/
│       └── src/api/generated/  # bản COPY trong mỗi app — gitignore
```

## Cài đặt (1 lần)

```bash
nvm use                 # Node 22 (theo .nvmrc)
pnpm install            # ở GỐC — chỉ cài công cụ codegen (openapi-typescript)
# rồi cài từng app khi đã scaffold:
pnpm install:platform   # = cd kids-platform && pnpm install
pnpm install:crm
pnpm install:mobile
```

## Sinh / cập nhật api-client (chạy mỗi khi API đổi)

```bash
pnpm gen:api --fresh    # xuất lại openapi.json TỪ kids-api rồi sinh + copy vào mọi app
# hoặc:
pnpm openapi            # chỉ xuất lại kids-api/openapi.json
pnpm gen:api            # sinh type từ openapi.json có sẵn + copy vào app
```

Sau khi copy, mỗi app dùng type qua lớp `src/api/http.ts` (mutator: bóc `{success,data}`,
gắn `Authorization` + `Host`, `401 → refresh`). Lớp này mỗi app giữ 1 bản (xem kế hoạch
[`kids-tasks/PHASE_UI_TASKS.md`](kids-tasks/PHASE_UI_TASKS.md) §3).

## Chạy dev

```bash
pnpm dev:api            # kids-api (NestJS) — cần Docker Postgres: cd kids-api && pnpm db:up
pnpm dev:platform       # console chủ Kim Thanh (admin.kimthanhkids.vn)
pnpm dev:crm            # CRM chủ trường (<slug>.kimthanhkids.vn)
pnpm dev:mobile         # Expo (iOS/Android/Web)
```

> Dev cần subdomain trỏ localhost: thêm vào `/etc/hosts`
> `127.0.0.1 admin.kimthanhkids.vn demo.kimthanhkids.vn app.kimthanhkids.vn`.

## Build production (VPS)

```bash
pnpm build:platform     # → kids-platform/dist (file tĩnh) → nginx
pnpm build:crm          # → kids-crm/dist → nginx
pnpm build:mobile-web   # → Expo web export (tĩnh) → nginx (PWA)
# kids-api: cd kids-api && pnpm build && pnpm start:prod (pm2)
```

nginx (gợi ý): `admin.*` → kids-platform/dist · `*.kimthanhkids.vn` → kids-crm/dist ·
`/api` reverse-proxy → kids-api (cổng nội bộ).
