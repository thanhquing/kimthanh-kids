# KimThanh Kids — Tài liệu hệ thống

Tài liệu tham chiếu cho hệ thống SaaS quản lý mầm non **KimThanh Kids**. Đây là nguồn tham chiếu chính cho dev (và cho Claude) khi làm việc với codebase.

## Bản đồ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tổng quan kiến trúc, tech stack, cấu trúc module, vòng đời request, guard chain |
| [MULTI_TENANCY.md](./MULTI_TENANCY.md) | Chiến lược đa-tenant (POOL/SILO), 4 lớp cô lập dữ liệu, tenant resolution, rủi ro rò rỉ |
| [DATABASE_ERD.md](./DATABASE_ERD.md) | Sơ đồ ER (Mermaid) + mô tả từng bảng của Tầng A |
| [BILLING.md](./BILLING.md) | Gói cước, state machine subscription, hóa đơn/thanh toán, feature-gating, quota, cron |
| [API.md](./API.md) | Danh mục endpoint **đầy đủ** (Tầng A + Phase 1 A→G): public/auth/tenant/billing/platform + domain nghiệp vụ |
| [UI_API_FLOW_TEST.md](./UI_API_FLOW_TEST.md) | Ledger kiểm thử cURL theo mock UI: Platform tenant → CRM chủ trường → app nhỏ/mobile |

> Tài liệu **nghiệp vụ/đào tạo/sale** (cho CEO, PO, chủ trường, Sale) ở thư mục riêng: [`kids-business-docs/`](../kids-business-docs).

## Cấu trúc hệ thống (các app)

```
kimthanh-kids/
├── kids-api/             # Backend NestJS + Prisma + PostgreSQL (XONG Phase 0 Tầng A + Phase 1 A→G)
├── kids-platform/        # Platform Console (React + Vite) — đã scaffold/tích hợp UI nền tảng
├── kids-crm/             # Web quản trị trường (React+Vite) — 🟡 scaffold + login (business API phần lớn chưa)
├── kids-mobile-native/   # App native PH/GV (Expo) — ⛔ chưa khởi tạo (sẽ copy-first từ mobile-web)
├── kids-mobile-web/      # App PH/GV (React+Vite PWA) — ✅ API thật + i18n VI/EN + login chọn trường (x-tenant)
├── kids-landing/         # Landing page (TanStack Start) — đã có
└── kids-documentation/   # Tài liệu (thư mục này)
```

## Lộ trình (phases)

- **Phase 0 — Tầng A (Platform/SaaS) — ĐÃ XONG:** đa-tenant, tenant/school, white-label, gói cước, subscription, billing nền tảng, feature-gating, quota, RBAC 2 cấp, auth.
- **Phase 1 — Tầng B (Domain nghiệp vụ) — ĐÃ XONG (A→G):** B hồ sơ/lớp/nhân sự · C điểm danh/báo cáo · D sức khỏe (health/medicine/incident/allergy/leave) · E học phí (VietQR/tiền mặt/VNPay + chứng từ) · F giao tiếp (announcement/menu/lesson-plan/album) · G observability (notification/dashboard/audit/usage). Mọi bảng domain có `tenantId` + `schoolId`. **Chat realtime đã loại khỏi kế hoạch.**
- **Phase UI:** `kids-platform` đã scaffold/tích hợp console nền tảng; `kids-crm`, `kids-mobile-native`, `kids-mobile-web` + push FCM là các bước tiếp theo, tiêu thụ lại API đã ổn định.

## Chạy nhanh `kids-api`

```bash
cd kids-api
pnpm install
pnpm db:up                 # Postgres qua Docker
cp .env.example .env
pnpm prisma:migrate        # tạo schema
pnpm prisma:seed           # 5 gói (free/starter/pro/enterprise/dedicated) + platform super-admin
pnpm prisma:seed:demo      # demo đầy đủ slug "demo" + 5 tenant platform case quota/công nợ/gói
pnpm start:dev             # http://localhost:3000/api  · Swagger: /docs
pnpm test:e2e              # 131 e2e / 15 suite
```

> Yêu cầu Node ≥ 20 (khuyến nghị 22). Tài khoản platform seed: `admin@kimthanhkids.vn` / `Admin@12345`.
