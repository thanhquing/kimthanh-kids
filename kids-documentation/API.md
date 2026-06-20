# Danh mục API — Tầng A

Base path: `/api`. Swagger: `GET /docs`. Envelope chuẩn xem [ARCHITECTURE.md](./ARCHITECTURE.md).
Auth: header `Authorization: Bearer <accessToken>`. Host quyết định tenant (xem [MULTI_TENANCY.md](./MULTI_TENANCY.md)).

## Public (không auth)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/public/signup` | Onboard trường mới → tạo Tenant + School + admin + TRIAL subscription + subdomain |
| GET | `/public/availability?slug=` | Kiểm tra slug khả dụng |
| GET | `/public/branding?host=` | Lấy white-label (logo/màu/tên) theo host — CRM load trước khi đăng nhập |

## Auth

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | public | Đăng nhập (theo host: platform hoặc tenant) → access + refresh token |
| POST | `/auth/refresh` | public | Cấp access token mới (rotation refresh) |
| POST | `/auth/logout` | bearer | Thu hồi refresh token |
| GET | `/auth/me` | bearer | Thông tin user hiện tại + roles |

## Tenant self-service (host = tenant; role `SCHOOL_ADMIN`/`PRINCIPAL`)

| Method | Path | Mô tả |
|---|---|---|
| GET / PATCH | `/tenant/settings` | Xem/sửa white-label (displayName, logo, màu, locale...) |
| GET / POST | `/tenant/schools` | Liệt kê / tạo cơ sở (auto-scope tenant) |
| GET | `/tenant/members` | Liệt kê thành viên + role |
| POST | `/tenant/members/invite` | Mời user (email, role, schoolId, password) |
| GET / POST | `/tenant/domains` | Liệt kê / thêm custom domain (trả verifyToken TXT) |
| POST | `/tenant/domains/:id/verify` | Xác minh custom domain → ACTIVE |

## Billing self-service (role `SCHOOL_ADMIN`/`FINANCE`)

| Method | Path | Inactive-OK | Mô tả |
|---|---|---|---|
| GET | `/billing/plans` | ✅ | Gói công khai để chọn |
| GET | `/billing/subscription` | ✅ | Thuê bao hiện tại + entitlements + usage |
| GET | `/billing/usage` | ✅ | Quota đang dùng |
| GET | `/billing/invoices` | ✅ | Hóa đơn của tenant (auto-scope) |
| POST | `/billing/subscription/change` | — | Đổi gói `{ planId, billingCycle }` |
| POST | `/billing/subscription/cancel` | — | Hủy `{ atPeriodEnd }` |
| POST | `/billing/invoices/:id/pay` | ✅ | Tạo thanh toán `{ provider }` → redirectUrl |

## Platform admin (host = `admin.*`; `@PlatformRoles`)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/platform/tenants?page=&status=` | Liệt kê tenant |
| GET | `/platform/tenants/:id` | Chi tiết tenant (settings, domains, schools, subscription, invoices) |
| POST | `/platform/tenants/:id/suspend` | Tạm khóa |
| POST | `/platform/tenants/:id/reactivate` | Mở lại |
| POST | `/platform/tenants/:id/entitlements` | Override feature/limit cho tenant |
| GET | `/platform/subscriptions` | Liệt kê thuê bao mọi tenant |
| GET | `/platform/invoices?tenantId=&status=` | Liệt kê hóa đơn |
| POST | `/platform/invoices` | Tạo hóa đơn kỳ `{ tenantId }` |
| POST | `/platform/invoices/:id/mark-paid` | Đánh dấu đã trả (manual) `{ amount }` |
| GET / POST | `/platform/plans` | Liệt kê / tạo gói (kèm prices/features/limits) |

## Webhook (public, verify chữ ký)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/platform/webhooks/:provider` | `vnpay` \| `momo` — dedupe `(provider,eventId)`, idempotent `(provider,gatewayRef)` → invoice PAID → reactivate |

## Mã lỗi thường gặp

`VALIDATION_FAILED` · `UNAUTHORIZED` · `INVALID_TOKEN` · `TENANT_MISMATCH` · `NO_TENANT` · `SUBSCRIPTION_SUSPENDED` · `SUBSCRIPTION_INACTIVE` · `FEATURE_NOT_AVAILABLE` · `QUOTA_EXCEEDED` · `SLUG_UNAVAILABLE` · `INVALID_SIGNATURE` · `NOT_FOUND`.
