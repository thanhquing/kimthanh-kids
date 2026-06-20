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
Host header
 ├─ TENANCY_MODE=SILO            → tenantId = FIXED_TENANT_ID
 ├─ host == PLATFORM_HOST        → platformScope = true (xác nhận lại bằng user role)
 ├─ host == API_HOST             → để trống → fallback JWT (mobile/API client)
 ├─ khớp TenantDomain (ACTIVE)   → tenantId
 └─ không khớp (vd localhost)    → để trống → fallback JWT
```

`JwtAuthGuard` sau đó patch context với `userId`, và đặt `platformScope = (user.type === PLATFORM)`. `TenantGuard` đảm bảo **`jwt.tenantId === host.tenantId`** (chống dùng token tenant A qua host tenant B).

## Rủi ro rò rỉ cross-tenant & cách chặn

| Rủi ro | Cách chặn |
|---|---|
| `$queryRaw`/`$executeRaw` bỏ qua extension | ESLint rule cấm trong domain code (xem `.eslintrc.cjs`); nếu cần, bind `tenantId` tường minh |
| Token tenant A dùng qua host tenant B | `TenantGuard` so khớp `jwt.tenantId === host.tenantId` → 403 `TENANT_MISMATCH` |
| Worker/cron mất ALS context | Job **bắt buộc nhận `tenantId` qua tham số**; KHÔNG đọc ALS trong worker (dùng `prisma.system` + filter tường minh) |
| Quên `tenantId` trên bảng domain mới | Convention bắt buộc; thêm vào `TENANT_KEY` của extension |
| `findUnique` theo id không filter | Dùng `findFirst` cho đọc đơn theo tenant (xem trên) |
| Platform impersonate quên reset scope | Token TTL ngắn + ghi `AuditLog` |

## Kiểm chứng (e2e)

[`test/isolation.e2e-spec.ts`](../kids-api/test/isolation.e2e-spec.ts) khẳng định **0 rò rỉ**: 2 tenant A/B, mỗi bên chỉ thấy school của mình; token A qua host B → 403; quota theo gói; vòng đời trial→expired→reactivate; webhook idempotent. **8/8 pass.**
