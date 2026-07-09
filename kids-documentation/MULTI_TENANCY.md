# Đa-tenant & Cô lập dữ liệu

## Mô hình HYBRID: POOL (mặc định) + SILO (tùy chọn)

| Chế độ | Mô tả | Dùng khi |
|---|---|---|
| **POOL** | 1 DB dùng chung cho mọi tenant, cô lập bằng cột `tenantId` trên mỗi bản ghi | Khách thuê tháng/quý/năm (đa số) |
| **SILO** | **CÙNG codebase**, deploy DB riêng cho 1 tenant | Trường muốn triển khai riêng / white-label sâu |

Code **không phân nhánh nghiệp vụ** giữa 2 chế độ. SILO chỉ khác ở vận hành: deploy với env `TENANCY_MODE=SILO` + `FIXED_TENANT_ID` + DATABASE_URL riêng → middleware luôn set context = tenant cố định, bỏ qua việc tra `TenantDomain`.

## `tenantId` vs `schoolId`

- **`tenantId`** = ranh giới **BẢO MẬT**. Luôn được auto-filter, không bao giờ tắt trong code phục vụ tenant.
- **`schoolId`** = ranh giới **NGHIỆP VỤ** (1 tenant có thể nhiều cơ sở). Filter theo quyền của user (membership). Role có `schoolId = null` = áp dụng toàn tenant (chuỗi).

## 4 lớp cô lập

1. **Request context (ALS)** — [`src/common/context/tenant-context.ts`](../kids-api/src/common/context/tenant-context.ts). `AsyncLocalStorage` giữ `{ tenantId, userId, allowedSchoolIds, platformScope }` cho mỗi request.
2. **Prisma Client Extension** — [`src/prisma/prisma-tenant.extension.ts`](../kids-api/src/prisma/prisma-tenant.extension.ts). Tự inject `where.tenantId` vào find/count/aggregate/updateMany/deleteMany; gán `data.tenantId` khi create; filter soft-delete (`deletedAt: null`) khi đọc. Truy cập qua **`prisma.db`**.
3. **Guard chain** — `JwtAuthGuard → TenantGuard → SubscriptionGuard → RolesGuard`.
4. **PostgreSQL RLS** *(tùy chọn, chưa bật)* — lưới an toàn cuối ở tầng DB.

### `prisma.db` vs `prisma.system`

| Client | Auto-filter tenant? | Dùng cho |
|---|---|---|
| **`prisma.db`** | ✅ Có (theo ALS) | Self-service tenant + toàn bộ domain Phase 1 |
| **`prisma.system`** | ❌ Không (thô) | Tenant resolution, provisioning, auth, cron/billing, platform-admin |

> ⚠️ KHÔNG dùng `prisma.system` trong code phục vụ 1 tenant — sẽ rò rỉ dữ liệu. Khi dùng, LUÔN filter/set `tenantId` tường minh.

### Giới hạn có chủ đích của extension

`findUnique`/`update`/`delete` theo khoá chính đơn **không** được inject `tenantId` (where chỉ nhận field unique). Vì vậy:
- Đọc/sửa 1 bản ghi theo tenant → dùng **`findFirst`** (đã được filter), hoặc kiểm tra quyền sở hữu sau khi fetch.
- Soft-delete khi GHI → service gọi `update({ data: { deletedAt: new Date() } })` thay vì `delete`.

## Tenant resolution

[`src/tenancy/tenant-resolution.middleware.ts`](../kids-api/src/tenancy/tenant-resolution.middleware.ts) chạy trước guard, set ALS context:

```
Thứ tự resolve (precedence): SILO → Host → x-tenant → JWT
 ├─ TENANCY_MODE=SILO            → tenantId = FIXED_TENANT_ID
 ├─ host == PLATFORM_HOST        → platformScope = true (xác nhận lại bằng user role)
 ├─ khớp TenantDomain (ACTIVE)   → tenantId
 ├─ header x-tenant: <tenantId>  → tenantId  (CHỈ khi Host chưa resolve & không platform)
 └─ host == API_HOST / không khớp (localhost) & không x-tenant → để trống → fallback JWT
```

`JwtAuthGuard` sau đó patch context: `tenantId = ctx.tenantId ?? user.tenantId` (tenant user), đặt `platformScope = (user.type === PLATFORM)`. `TenantGuard` đảm bảo **`jwt.tenantId === ctx.tenantId`** nếu ctx đã có (chống dùng token tenant A qua host/x-tenant của tenant B → 403 `TENANT_MISMATCH`).

### Chọn tenant độc lập subdomain (CRM + mobile)

Client không qua subdomain (mobile-web/native, CRM dev) chọn trường ở **màn login** rồi gửi tenant qua header — không phụ thuộc Host:

1. **Discovery công khai** `GET /public/tenants?q=` (`@Public`, cross-tenant `prisma.system`): `q` rỗng → danh sách (cap 50, sắp theo tên); có `q` → lọc theo tên/`Tenant.code`/MST. Trả **chỉ field an toàn** `{ id, code, slug, displayName, logoUrl, primaryDomain }` (ẩn `SUSPENDED`/đã xoá; cho tìm theo MST nhưng **KHÔNG trả `taxCode`**; cũng KHÔNG lộ gói/email/bank).
2. Client lưu `tenantId` đã chọn, gửi **`x-tenant: <tenantId>`** ở `POST /auth/login` (và các request sau — tùy chọn vì token đã mang `tenantId`).
3. **An toàn:** `x-tenant` chỉ *seed* context **trước auth**; sau khi có token, `jwt.tenantId` là nguồn sự thật và `TenantGuard` chặn nếu lệch → **không thể vượt tenant**. `x-tenant` sai/không có khi login tenant (mà cũng không có Host) → `TENANT_REQUIRED`.

Field **`Tenant.code`** (human-friendly, `@unique`) phục vụ search/hiển thị ở dropdown; nhập ở form tạo tenant của platform hoặc tự sinh từ `slug` lúc signup.

## Rủi ro rò rỉ cross-tenant & cách chặn

| Rủi ro | Cách chặn |
|---|---|
| `$queryRaw`/`$executeRaw` bỏ qua extension | ESLint rule cấm trong domain code (xem `.eslintrc.cjs`); nếu cần, bind `tenantId` tường minh |
| Token tenant A dùng qua host/`x-tenant` của tenant B | `TenantGuard` so khớp `jwt.tenantId === ctx.tenantId` → 403 `TENANT_MISMATCH` (đã test cả qua proxy không-Host + x-tenant) |
| Worker/cron mất ALS context | Job **bắt buộc nhận `tenantId` qua tham số**; KHÔNG đọc ALS trong worker (dùng `prisma.system` + filter tường minh) |
| Quên `tenantId` trên bảng domain mới | Convention bắt buộc; thêm vào `TENANT_KEY` của extension |
| `findUnique` theo id không filter | Dùng `findFirst` cho đọc đơn theo tenant (xem trên) |
| Platform impersonate quên reset scope | Token TTL ngắn + ghi `AuditLog` |

## Kiểm chứng (e2e)

[`test/isolation.e2e-spec.ts`](../kids-api/test/isolation.e2e-spec.ts) khẳng định **0 rò rỉ**: 2 tenant A/B, mỗi bên chỉ thấy school của mình; token A qua host B → 403; quota theo gói; vòng đời trial→expired→reactivate; webhook idempotent. **8/8 pass.**
