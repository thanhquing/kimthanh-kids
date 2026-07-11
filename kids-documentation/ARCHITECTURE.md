# Kiến trúc `kids-api`

## Tech stack

- **NestJS 11** (DI, guards, interceptors, modules; trên Express 5)
- **Prisma 5 + PostgreSQL 16** (ORM, migrations, client extension cho multi-tenant)
- **JWT** access HS256 (15m, claim `tv`=tokenVersion → vô hiệu khi reset mật khẩu; web FE giữ **in-memory**) + refresh (30d, hash SHA-256, rotation theo `familyId` + **reuse-detection** revoke cả họ; trả qua **cookie `HttpOnly` `kk_rt`** — SameSite=Lax, Path bám global prefix, host-only, không lộ ra body/JS; web FE production chạy **same-origin** với API qua reverse proxy `/api`; client không có cookie jar khai header `x-client: native` → nhận refreshToken ở body lưu SecureStore) · **bcrypt** (cost `BCRYPT_COST`, rehash-on-login) · **account lockout** (`failedLoginCount`/`lockedUntil`, ngưỡng `AUTH_LOCKOUT_*`)
- **Zod** validate env + request body · **class-validator** (global ValidationPipe)
- **@nestjs/schedule** (cron) · **@nestjs/throttler** (2 named throttler env-driven: `default` 120/60s mọi route + `auth` 5/60s cho `/auth/login`+`/auth/refresh` chống brute-force; cấu hình `THROTTLE_*`/`AUTH_THROTTLE_*`) · **helmet** · **trust proxy** (`TRUST_PROXY`) · **Swagger** (`/docs`)
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
├── tenancy/                 # TenantResolutionMiddleware (SILO → Host → x-tenant → JWT)
├── auth/                    # login/refresh/logout/me + TokenService + UserContextService
├── entitlement/             # EntitlementService (resolve features/limits + quota)
├── consent/                 # @Global — văn bản pháp lý versioned + log chấp thuận (BL-046): GET /public/legal, /consent/pending, /consent/accept
├── provisioning/            # POST /public/signup + public plans + branding + availability + GET /public/tenants (discovery chọn trường, độc lập subdomain)
├── billing/                 # plan/subscription/invoice/payment/webhook/cron/lifecycle (grace dunning ← PlatformConfig)
├── platform-config/         # PlatformConfigService — config nền tảng singleton (NH VietQR + grace dunning); dùng chung billing + platform (tránh cycle)
├── platform/                # platform-admin (tenants/subs/invoices/plans/coupons/audit/worklist/settings/posts) + dashboard/MRR + PublicInvoiceController + PublicPostsController
├── tenant/                  # self-service (settings/white-label/schools/members/domains)
│   ── Phase 1 (domain nghiệp vụ A→G) ──
├── students/ classrooms/    # B  hồ sơ học sinh + lớp + guardian
├── attendance/ daily-reports/  # C  điểm danh + báo cáo ngày
├── pickup/                 #    người được phép đón + nhật ký CHECK_IN/CHECK_OUT
├── media/                   #    upload ảnh (sharp → webp, quota STORAGE_MB)
├── health/ medicine/ incidents/ leave/  # D  sức khỏe (+ allergies)
├── assignments/             # B3 phân công nhân sự (lịch tuần)
├── tuition/                 # E  học phí (VietQR/cash/VNPay + print + CSV)
├── announcements/ menus/ lesson-plans/ albums/  # F  giao tiếp & nội dung
└── notifications/ dashboard/ audit/ usage/      # G  observability (@Global services)
```

## Vòng đời request

```
Request
 → TenantResolutionMiddleware   (set ALS: tenantId / platformScope từ Host)
 → ThrottlerGuard               (rate limit: default 120/60s · auth 5/60s cho login/refresh)
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
5. **Content landing là platform-global:** `PlatformPost` phục vụ blog/SEO landing, quản lý bởi `kids-platform`, public đọc qua `/public/posts`. Bảng này **không tenant-scoped**, dùng `prisma.system`, không thêm vào `TENANT_KEY`. Cover blog là public asset của API (`/public/assets/blog/:file`, nguồn `kids-api/public/blog` hoặc storage/CDN sau này); landing chỉ render `coverImageUrl` API trả về, không giữ bộ ảnh blog production trong bundle FE.
6. **Topology web production:** web app và API phải same-origin (mỗi host phục vụ FE tĩnh + reverse proxy `/api` về `kids-api`) để refresh cookie `SameSite=Lax` host-only hoạt động ổn định. Nếu sau này tách `crm.*` gọi `api.*`, phải đổi thiết kế cookie sang `SameSite=None; Secure` + domain phù hợp và smoke login/refresh lại.
7. **`prisma.db` (auto-filter) vs `prisma.system` (raw)** — phân tách rõ để chống rò rỉ.

## Domain nghiệp vụ (Phase 1 — A→G)

Mọi bảng domain có `tenantId` (cô lập, trong `TENANT_KEY`) + `schoolId` (nghiệp vụ). Quy ước module: Prisma model → migration → service (`prisma.db`) → controller (`@Roles` + scope) → Zod DTO → e2e cô lập.

| Nhóm | Module | Điểm chính |
| --- | --- | --- |
| **B** Hồ sơ/tổ chức | students, classrooms (+ guardians) | CRUD, gán phụ huynh (`StudentParent` N-N), "con của tôi" cho PH; quota STUDENTS/TEACHERS (CLASSROOMS đã gỡ — BL-049) |
| **B3** Nhân sự | assignments | tạo tài khoản trực tiếp (`/tenant/members`, email **hoặc** phone), bật/tắt (nhả quota); lịch phân công tuần (weekday+shift+duty) |
| **C** Vận hành | attendance, daily-reports, pickup, media | điểm danh hàng loạt theo lớp (unique studentId+date); báo cáo ngày (upsert + ảnh đính kèm qua media); danh sách người được phép đón + nhật ký CHECK_IN/CHECK_OUT; ảnh nén webp |
| **D** Sức khỏe | health, medicine, incidents, leave | chỉ số + API growth; đơn thuốc (state machine PENDING→APPROVED→ADMINISTERED + history); sự cố; dị ứng (cho cảnh báo menu); đơn nghỉ duyệt 1 lần |
| **E** Học phí | tuition | `TuitionInvoice/Item/Payment`, số HĐ tuần tự; **VietQR** (EMVCo+CRC16, miễn phí) + **tiền mặt** + **VNPay sandbox** (webhook idempotent); bản in HTML + xuất CSV; cron `markOverdue` |
| **F** Giao tiếp | announcements, menus, lesson-plans, albums | thông báo (audience ALL/PARENTS/TEACHERS/CLASS, feed lọc theo người xem); thực đơn + cảnh báo dị ứng; giáo án (`@RequireFeature lesson_plan`); album (`@RequireFeature media_gallery`) |
| **G** Observability | notifications, dashboard, audit, usage | thông báo in-app + preference; dashboard KPI school-scope; `AuditLog` hành động nhạy cảm; `UsageEvent` (DAU/WAU/MAU operator) |

**Scope đọc dữ liệu** (`src/common/scope/school-scope.ts`): `schoolWhere` (staff theo cơ sở), `recordScopeWhere`/`ownedStudentWhere` (PH chỉ thấy con), `contentScopeForKids` (menu/album của trường/lớp con), `STAFF_ROLE_LIST`.

**Quan sát khi sửa code (gotchas):**

- `findUnique/update/delete` theo PK **không** được extension inject `tenantId` → dùng `findFirst` trước, hoặc set `tenantId` tường minh ở `create` lồng nhau / `upsert` / `createMany`.
- Validate query param bằng `ZodValidationPipe` (vd `audience`, `studentId`, `weekStart`) để tránh 500 do Prisma nhận sai kiểu.
- `NotificationsService.notify` + `AuditService.log` là **best-effort** (tự nuốt lỗi + Logger) — không bao giờ làm hỏng hành động chính. `notify` là **điểm phát duy nhất** để gắn push FCM về sau.
- Cột có thời điểm thật dùng `DateTime @db.Timestamptz(3)` (DB lưu mốc thời gian rõ timezone, Prisma đọc/ghi `Date` UTC); cột date-only dùng `@db.Date` từ chuỗi `YYYY-MM-DD`. Dashboard tính "hôm nay" theo `TenantSettings.timezone` (mặc định `Asia/Ho_Chi_Minh`).
- `AuditLog`/`UsageEvent` đọc xuyên tenant qua `prisma.system`; ghi set `tenantId` tường minh.

**Luồng tiêu biểu:**

- *Notification fan-out:* 6 sự kiện phát in-app — tạo báo cáo ngày, publish announcement (theo audience), tạo sự cố, phát hành hóa đơn, y tá xử lý thuốc, duyệt đơn nghỉ.
- *Thanh toán học phí:* VietQR tự sinh (không cổng) · tiền mặt (KT ghi `pay/manual`) · VNPay (`pay/gateway` → IPN `tuition/webhooks/vnpay` idempotent). Đối soát VietQR tự động + MoMo/ZaloPay = P2.

## Kiểm thử & vận hành

- `pnpm test:e2e` — **181 e2e / 21 suite** (gồm isolation đa-tenant 8/8 + tenant-discovery/x-tenant 7/7 + pickup 7/7 + consent 4/4 + plan-versioning 4/4 + schema-freeze/config guards).
- **Contract FE↔BE:** type FE viết tay (không dùng OpenAPI codegen) — Swagger KHÔNG introspect được Zod DTO nên `openapi.json` rỗng schema, generated types chỉ là vỏ `never`. Chống drift bằng **contract e2e** assert shape response/params cho endpoint FE/mobile phụ thuộc (vd `/auth/me`, `/platform/invoices` money=number, native token-in-body). Muốn adopt generated types thì phải wire Zod→OpenAPI trước (xem SECURITY_AUDIT_CHECKLIST).
- `pnpm prisma:migrate` / `pnpm prisma:seed` — schema + dữ liệu mẫu.
- `pnpm lint` / `pnpm exec tsc --noEmit` — sạch.
- Cron billing chạy tự động (`@nestjs/schedule`); logic tách ở `BillingJobsService` để test gọi trực tiếp.
- Cron MRR (`MrrSnapshotCron`, đầu mỗi tháng) chốt `MrrSnapshot` số thực; logic ở `MrrSnapshotService` (test + backfill gọi trực tiếp). Dashboard/biểu đồ doanh thu đọc snapshot, thiếu tháng nào thì suy ngược (DERIVED).
