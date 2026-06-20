# Kiến trúc `kids-api`

## Tech stack

- **NestJS 10** (DI, guards, interceptors, modules)
- **Prisma 5 + PostgreSQL 16** (ORM, migrations, client extension cho multi-tenant)
- **JWT** access (15m) + refresh (30d, hash SHA-256, rotation) · **bcrypt**
- **Zod** validate env + request body · **class-validator** (global ValidationPipe)
- **@nestjs/schedule** (cron) · **@nestjs/throttler** (rate-limit 120/60s) · **helmet** · **Swagger** (`/docs`)
- Package manager: **pnpm** · Node ≥ 20

## Cấu trúc thư mục

```
kids-api/src/
├── main.ts                  # bootstrap: helmet, cors, prefix /api, swagger
├── app.module.ts            # wire module + guard chain (APP_GUARD) + middleware
├── config/                  # Zod env schema + EnvService (typed)
├── prisma/                  # PrismaService (.db extended, .system raw) + tenant extension
├── common/
│   ├── context/             # AsyncLocalStorage tenant-context
│   ├── decorators/          # @Public @CurrentUser @Roles @PlatformRoles @RequireFeature @AllowInactive
│   ├── guards/              # Jwt / Tenant / Subscription / Roles
│   ├── filters/             # AllExceptionsFilter → ApiError envelope
│   ├── interceptors/        # TransformInterceptor → ApiSuccess envelope
│   ├── http/                # ApiResponse types + paginated()
│   └── pipes/               # ZodValidationPipe
├── tenancy/                 # TenantResolutionMiddleware
├── auth/                    # login/refresh/logout/me + TokenService + UserContextService
├── entitlement/             # EntitlementService (resolve features/limits + quota)
├── provisioning/            # POST /public/signup + branding + availability
├── billing/                 # plan/subscription/invoice/payment/webhook/cron/lifecycle
├── platform/                # platform-admin (tenants/subscriptions/invoices/plans)
└── tenant/                  # self-service (settings/white-label/schools/members/domains)
```

## Vòng đời request

```
Request
 → TenantResolutionMiddleware   (set ALS: tenantId / platformScope từ Host)
 → ThrottlerGuard               (rate limit)
 → JwtAuthGuard                 (verify token → req.user → patch ALS)   [bỏ qua nếu @Public]
 → TenantGuard                  (khớp jwt.tenantId === host.tenantId)
 → SubscriptionGuard            (trạng thái thuê bao + @RequireFeature)
 → RolesGuard                   (@Roles / @PlatformRoles)
 → ZodValidationPipe (@Body)    (validate dữ liệu)
 → Controller → Service → prisma.db (auto-filter tenant)
 → TransformInterceptor         (bọc { success, data, meta })
 → (lỗi) AllExceptionsFilter    (bọc { success:false, error:{ code, message } })
```

## RBAC 2 cấp

- **Platform** (staff của bạn): `PLATFORM_SUPER_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_BILLING` — lưu ở `User.platformRole`. Kiểm tra bằng `@PlatformRoles(...)`.
- **Tenant** (người dùng trường): `SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `NURSE`, `FINANCE`, `PARENT` — lưu ở `Membership` (scope theo `schoolId`). Kiểm tra bằng `@Roles(...)`.

## Envelope chuẩn

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 42 } }
// error
{ "success": false, "error": { "code": "QUOTA_EXCEEDED", "message": "...", "details": {} } }
```

## Quyết định kiến trúc chính

1. **Multi-tenancy HYBRID** (POOL + SILO) — xem [MULTI_TENANCY.md](./MULTI_TENANCY.md).
2. **Tenant 1..N School** — Tenant là đơn vị thuê/billing; School là cơ sở. Hỗ trợ chuỗi (tier ENTERPRISE).
3. **Subscription là nguồn chân lý trạng thái**; `Tenant.status` là cache để guard đọc nhanh.
4. **Tách 2 lớp billing**: platform (bạn ← trường) vs tuition (trường ← phụ huynh, thuộc Phase 1). Bảng platform có prefix `Platform*`.
5. **`prisma.db` (auto-filter) vs `prisma.system` (raw)** — phân tách rõ để chống rò rỉ.

## Kiểm thử & vận hành

- `pnpm test:e2e` — e2e cô lập đa-tenant (8/8 pass).
- `pnpm prisma:migrate` / `pnpm prisma:seed` — schema + dữ liệu mẫu.
- `pnpm lint` / `pnpm exec tsc --noEmit` — sạch.
- Cron billing chạy tự động (`@nestjs/schedule`); logic tách ở `BillingJobsService` để test gọi trực tiếp.
