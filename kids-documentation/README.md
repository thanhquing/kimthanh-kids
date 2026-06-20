# KimThanh Kids — Tài liệu hệ thống

Tài liệu tham chiếu cho hệ thống SaaS quản lý mầm non **KimThanh Kids**. Đây là nguồn tham chiếu chính cho dev (và cho Claude) khi làm việc với codebase.

## Bản đồ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tổng quan kiến trúc, tech stack, cấu trúc module, vòng đời request, guard chain |
| [MULTI_TENANCY.md](./MULTI_TENANCY.md) | Chiến lược đa-tenant (POOL/SILO), 4 lớp cô lập dữ liệu, tenant resolution, rủi ro rò rỉ |
| [DATABASE_ERD.md](./DATABASE_ERD.md) | Sơ đồ ER (Mermaid) + mô tả từng bảng của Tầng A |
| [BILLING.md](./BILLING.md) | Gói cước, state machine subscription, hóa đơn/thanh toán, feature-gating, quota, cron |
| [API.md](./API.md) | Danh mục endpoint (public / auth / tenant / platform-admin / webhook) |

## Cấu trúc hệ thống (các app)

```
kimthanh-kids/
├── kids-api/             # Backend NestJS + Prisma + PostgreSQL (đang xây — Phase 0: Tầng A SaaS)
├── kids-crm/             # Web quản trị cho trường (chưa khởi tạo)
├── kids-mobile-native/   # App native phụ huynh/giáo viên (chưa khởi tạo)
├── kids-mobile-web/      # Mobile web (chưa khởi tạo)
├── kids-landing/         # Landing page (TanStack Start) — đã có
└── kids-documentation/   # Tài liệu (thư mục này)
```

## Lộ trình (phases)

- **Phase 0 — Tầng A (Platform/SaaS) — ĐÃ XONG ở `kids-api`:** đa-tenant, tenant/school, white-label, gói cước, subscription, billing nền tảng, feature-gating, quota, RBAC 2 cấp, auth. UI tầng này dựng sau từ API.
- **Phase 1 — Tầng B (Domain nghiệp vụ):** students, classrooms, attendance, daily reports, health/medicine, tuition (học phí trường→phụ huynh), announcements, chat, menu, lesson plan, notifications... Mọi bảng domain BẮT BUỘC có `tenantId` + `schoolId`.

## Chạy nhanh `kids-api`

```bash
cd kids-api
pnpm install
pnpm db:up                 # Postgres qua Docker
cp .env.example .env
pnpm prisma:migrate        # tạo schema
pnpm prisma:seed           # 4 gói + platform super-admin
pnpm start:dev             # http://localhost:3000/api  · Swagger: /docs
pnpm test:e2e              # test cô lập đa-tenant
```

> Yêu cầu Node ≥ 20 (khuyến nghị 22). Tài khoản platform seed: `admin@kimthanhkids.vn` / `Admin@12345`.
