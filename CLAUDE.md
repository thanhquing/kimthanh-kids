# CLAUDE.md — Nền tham chiếu cho AI agent

> File này được nạp tự động mỗi phiên. Đọc trước khi làm bất kỳ task nào. Giữ NGẮN — chi tiết nằm ở các tài liệu được trỏ tới (single source of truth).

## Dự án là gì

**KimThanh Kids** — SaaS đa-tenant quản lý trường mầm non (mỗi trường = 1 tenant, truy cập qua subdomain riêng). Backend **API-first**: `kids-api` (NestJS + Prisma + PostgreSQL).
**Trạng thái:** Phase 0 (nền tảng SaaS) + Phase 1 nghiệp vụ **A→G** đã XONG (99 e2e / 13 suite). UI (web CRM + mobile) là **phase sau**.

## Bản đồ repo

| Thư mục                                                | Nội dung                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `kids-api/`                                            | Backend (nguồn sự thật của code) — schema `prisma/schema.prisma`, controller `src/**/*.controller.ts` |
| `kids-documentation/`                                  | **Tài liệu KỸ THUẬT** (dev/AI): ARCHITECTURE · MULTI_TENANCY · DATABASE_ERD · BILLING · API           |
| `kids-business-docs/`                                  | Tài liệu **nghiệp vụ/đào tạo/sale** (CEO/PO/Sale)                                                     |
| `kids-tasks/PHASE_DOMAIN_API_TASKS.md`                 | Kế hoạch & tiến độ (checklist task)                                                                   |
| `kids-landing/public/mock-ui/`                         | Mockup UI tham chiếu                                                                                  |
| `kids-crm/`, `kids-mobile-native/`, `kids-mobile-web/` | Phase UI — **chưa khởi tạo**                                                                          |

## Đọc trước khi làm task (theo loại việc)

- **Hiểu hệ thống / sửa code API:** [`kids-documentation/ARCHITECTURE.md`](kids-documentation/ARCHITECTURE.md) → [`MULTI_TENANCY.md`](kids-documentation/MULTI_TENANCY.md) → [`DATABASE_ERD.md`](kids-documentation/DATABASE_ERD.md).
- **Thêm/đổi endpoint:** [`kids-documentation/API.md`](kids-documentation/API.md).
- **Gói cước/billing/quota:** [`kids-documentation/BILLING.md`](kids-documentation/BILLING.md).
- **Biết việc cần làm tiếp:** [`kids-tasks/PHASE_DOMAIN_API_TASKS.md`](kids-tasks/PHASE_DOMAIN_API_TASKS.md).
- **Hiểu nghiệp vụ/giá/role để giải thích:** [`kids-business-docs/`](kids-business-docs/).

## Quy ước code (bắt buộc — chi tiết ở ARCHITECTURE §gotchas)

- Multi-tenant: dùng **`prisma.db`** (tự lọc `tenantId`) cho code phục vụ tenant; **`prisma.system`** (thô) chỉ cho cron/platform/auth + filter tường minh.
- `findUnique/update/delete` theo PK **không** auto-inject `tenantId` → dùng `findFirst` trước; set `tenantId` tường minh ở `create` lồng/`upsert`/`createMany`.
- Bảng domain mới: bắt buộc `tenantId` + `schoolId` và thêm tên model vào `TENANT_KEY` (`src/prisma/prisma-tenant.extension.ts`).
- Quy ước module: model → migration → service → controller (`@Roles` + scope) → Zod DTO → e2e cô lập.
- Validate query param bằng `ZodValidationPipe` (tránh 500 do Prisma nhận sai kiểu).
- `NotificationsService.notify` + `AuditService.log` là **best-effort** (nuốt lỗi + Logger) — không làm vỡ hành động chính. `notify` là điểm phát duy nhất để gắn push FCM sau.

## Quy tắc làm việc (standing — tuân thủ tuyệt đối)

- **KHÔNG tự ý commit.** Làm xong chỉ **gợi ý commit message**; chờ người dùng commit.
- **Chạy nền vững trước khi mở rộng** — ưu tiên đúng đắn + test xanh hơn là làm nhanh.
- Trước khi báo "xong": **`tsc --noEmit` + `eslint` + `test:e2e` phải sạch** (Node ≥ 20 — `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`).
- **Đừng quảng bá/cam kết tính năng chưa có:** Chat realtime (**đã loại khỏi kế hoạch**), push FCM (phase mobile), auto đối soát VietQR, cổng MoMo/ZaloPay, analytics nâng cao, app store — tất cả là sau/P2.
- Khi sửa tài liệu: cập nhật đúng nguồn (kỹ thuật → `kids-documentation/`, nghiệp vụ → `kids-business-docs/`), không tạo file trùng.

## Đồng bộ tài liệu khi đổi code (BẮT BUỘC trong cùng task)

Khi thay đổi code ảnh hưởng hành vi đã tài liệu hóa, **cập nhật doc tương ứng ngay trong task đó** (đừng để drift). Bản đồ:

| Đổi ở                                                   | Cập nhật tài liệu                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `prisma/schema.prisma` (model/field/enum/index)         | `kids-documentation/DATABASE_ERD.md` (+ ARCHITECTURE nếu đổi cấu trúc/quan hệ)             |
| `src/**/*.controller.ts` (route/@Roles/@RequireFeature) | `kids-documentation/API.md` (+ `kids-business-docs/02-ROLES-PERMISSIONS.md` nếu đổi quyền) |
| `prisma/seed.ts` (gói/giá/limit/feature)                | `kids-documentation/BILLING.md` + `kids-business-docs/` (giá ở SALES/BUSINESS)             |
| Thêm/bỏ module, đổi guard/luồng                         | `kids-documentation/ARCHITECTURE.md` (module map + §domain)                                |
| Quota/feature-gating                                    | `kids-documentation/BILLING.md`                                                            |
| Hoàn tất/đổi phạm vi task                               | `kids-tasks/PHASE_DOMAIN_API_TASKS.md` (tick + cập nhật header)                            |

Nguyên tắc: tài liệu KỸ THUẬT ở `kids-documentation/`, NGHIỆP VỤ/SALE ở `kids-business-docs/` — sửa đúng 1 nơi, không tạo file trùng. Sau khi sửa doc: kiểm tra link `.md` nội bộ không gãy.

## Lệnh hay dùng (trong `kids-api/`)

```bash
pnpm db:up                 # postgres (docker)
pnpm prisma:deploy         # áp migration
pnpm prisma:seed           # 5 gói + platform super-admin
pnpm prisma:seed:demo      # 1 trường demo đầy đủ (gói PRO, slug "demo")
pnpm start:dev             # /api · Swagger /docs
pnpm test:e2e              # 99 e2e / 13 suite
```

Demo login (host `demo.<ROOT_DOMAIN>`, mật khẩu `Password123`): `admin@hoasen.edu.vn` (admin) … `ph01@gmail.com` (PH). Platform: `admin@kimthanhkids.vn` / `Admin@12345`.
