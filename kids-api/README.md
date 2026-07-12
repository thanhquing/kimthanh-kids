# kids-api

Backend đa-tenant (SaaS) cho hệ thống quản lý mầm non **KimThanh Kids**.
**NestJS + Prisma + PostgreSQL.**

> **Phase 0 (ĐÃ XONG) — Tầng A (Platform/SaaS):** đa-tenant (POOL+SILO), tenant/school, white-label,
> gói cước, subscription, billing nền tảng, feature-gating, quota, RBAC 2 cấp, auth JWT.
> **Phase 1 (ĐÃ XONG) — Tầng B nghiệp vụ A→G:** hồ sơ/lớp/nhân sự, điểm danh, báo cáo ngày,
> sức khỏe/thuốc/sự cố/nghỉ phép, học phí, thông báo, thực đơn, giáo án, album, dashboard/audit/notification.
> Tài liệu chi tiết: [`../kids-documentation/`](../kids-documentation/README.md).

## Chạy

```bash
pnpm install
pnpm db:up                 # Postgres qua Docker (cổng 5432)
cp .env.example .env
pnpm prisma:migrate        # tạo schema
pnpm prisma:seed           # 5 gói + platform super-admin (admin@kimthanhkids.vn / Admin@12345)
pnpm prisma:seed:demo      # demo tenant "demo" + data nghiệp vụ + platform case quota/công nợ/gói
pnpm start:dev             # http://localhost:3000/api  ·  Swagger: /docs
```

## Kiểm thử & chất lượng

```bash
pnpm test:e2e              # 181 e2e / 21 suite (inventory hiện tại)
pnpm exec tsc --noEmit     # type-check
pnpm lint                  # eslint (chặn $queryRaw trong domain code)
```

## Tài liệu

| Chủ đề | Tài liệu |
|---|---|
| Kiến trúc & guard chain | [ARCHITECTURE.md](../kids-documentation/ARCHITECTURE.md) |
| Đa-tenant & cô lập dữ liệu | [MULTI_TENANCY.md](../kids-documentation/MULTI_TENANCY.md) |
| Sơ đồ ER (Mermaid) | [DATABASE_ERD.md](../kids-documentation/DATABASE_ERD.md) |
| Gói cước & billing | [BILLING.md](../kids-documentation/BILLING.md) |
| Danh mục API | [API.md](../kids-documentation/API.md) |

> Yêu cầu Node ≥ 20 (khuyến nghị 22). Schema nguồn chân lý: `prisma/schema.prisma`.
