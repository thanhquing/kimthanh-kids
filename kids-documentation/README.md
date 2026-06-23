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

> Tài liệu **nghiệp vụ/đào tạo/sale** (cho CEO, PO, chủ trường, Sale) ở thư mục riêng: [`kids-business-docs/`](../kids-business-docs).

## Cấu trúc hệ thống (các app)

```
kimthanh-kids/
├── kids-api/             # Backend NestJS + Prisma + PostgreSQL (XONG Phase 0 Tầng A + Phase 1 A→G)
├── kids-crm/             # Web quản trị cho trường (phase UI — chưa khởi tạo)
├── kids-mobile-native/   # App native phụ huynh/giáo viên (phase UI — chưa khởi tạo)
├── kids-mobile-web/      # Mobile web (phase UI — chưa khởi tạo)
├── kids-landing/         # Landing page (TanStack Start) — đã có
└── kids-documentation/   # Tài liệu (thư mục này)
```

## Lộ trình (phases)

- **Phase 0 — Tầng A (Platform/SaaS) — ĐÃ XONG:** đa-tenant, tenant/school, white-label, gói cước, subscription, billing nền tảng, feature-gating, quota, RBAC 2 cấp, auth.
- **Phase 1 — Tầng B (Domain nghiệp vụ) — ĐÃ XONG (A→G):** B hồ sơ/lớp/nhân sự · C điểm danh/báo cáo · D sức khỏe (health/medicine/incident/allergy/leave) · E học phí (VietQR/tiền mặt/VNPay + chứng từ) · F giao tiếp (announcement/menu/lesson-plan/album) · G observability (notification/dashboard/audit/usage). Mọi bảng domain có `tenantId` + `schoolId`. **Chat realtime đã loại khỏi kế hoạch.**
- **Phase UI (sau cùng):** kids-crm, kids-mobile-native, kids-mobile-web + push FCM — tiêu thụ lại API đã ổn định.

## Chạy nhanh `kids-api`

```bash
cd kids-api
pnpm install
pnpm db:up                 # Postgres qua Docker
cp .env.example .env
pnpm prisma:migrate        # tạo schema
pnpm prisma:seed           # 5 gói (free/starter/pro/enterprise/dedicated) + platform super-admin
pnpm prisma:seed:demo      # 1 trường demo đầy đủ (gói PRO, slug "demo")
pnpm start:dev             # http://localhost:3000/api  · Swagger: /docs
pnpm test:e2e              # 99 e2e / 13 suite
```

> Yêu cầu Node ≥ 20 (khuyến nghị 22). Tài khoản platform seed: `admin@kimthanhkids.vn` / `Admin@12345`.
