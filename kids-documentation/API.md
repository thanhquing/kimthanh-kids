# API Contract — KimThanh Kids (`kids-api`)

Base path: `/api`. Swagger UI: `GET /docs` khi `NODE_ENV != production`.
Host quyết định tenant: tenant dùng `<slug>.<ROOT_DOMAIN>`, platform dùng `admin.<ROOT_DOMAIN>`.

Header auth chuẩn:

```http
Authorization: Bearer <accessToken>
Host: demo.kimthanhkids.vn
X-Language: vi
```

## Quy ước chung

Response JSON được `TransformInterceptor` bọc:

```json
{ "success": true, "data": {} }
```

Response phân trang:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 42 }
}
```

Các list endpoint tenant/domain dùng `page` + `pageSize` (hoặc alias cũ `limit`) với `page <= 10000` và `pageSize/limit <= 100`; thiếu query thì mặc định tối đa 100 item/trang, trừ endpoint ghi cap riêng.

Error:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_FAILED", "message": "...", "details": {} }
}
```

Ngôn ngữ lỗi: client gửi `x-language: vi|en` trong mọi request. API chọn `error.message`
theo header này cho các mã lỗi phổ biến; `error.code` luôn ổn định để FE xử lý logic.
Nếu thiếu header, mặc định `vi`.

Ngoại lệ trả raw response: `GET /media/:id/file` trả stream file, `GET /tuition/invoices/:id/print` trả HTML, `GET /tuition/invoices/export` trả CSV.

Ký hiệu role: `AD` = SCHOOL_ADMIN, `HT` = PRINCIPAL, `GV` = TEACHER, `YT` = NURSE, `KT` = FINANCE, `PH` = PARENT, `STAFF` = AD/HT/GV/YT/KT.

## Enum dùng trong API

| Enum                        | Values                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `TenantRole`                | `SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `NURSE`, `FINANCE`, `PARENT`                           |
| `TenantStatus`              | `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`                                        |
| `SubscriptionStatus`        | `TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`, `EXPIRED`                           |
| `PlanTier`                  | `FREE`, `STARTER`, `PRO`, `ENTERPRISE`, `CUSTOM`                                               |
| `Gender`                    | `MALE`, `FEMALE`, `OTHER`                                                                      |
| `StudentStatus`             | `ACTIVE`, `INACTIVE`, `GRADUATED`, `WITHDRAWN`                                                 |
| `AttendanceStatus`          | `PRESENT`, `LATE`, `ABSENT`, `EXCUSED`                                                         |
| `PickupAuthorizationStatus` | `ACTIVE`, `REVOKED`                                                                            |
| `PickupEventType`           | `CHECK_IN`, `CHECK_OUT`                                                                        |
| `Mood`                      | `HAPPY`, `NEUTRAL`, `TIRED`, `FUSSY`                                                           |
| `MediaKind`                 | `REPORT_PHOTO`, `ALBUM`, `AVATAR`, `DOCUMENT`, `OTHER`                                         |
| `MedicineStatus`            | `PENDING`, `APPROVED`, `ADMINISTERED`, `REJECTED`                                              |
| `IncidentSeverity`          | `LOW`, `MEDIUM`, `HIGH`                                                                        |
| `LeaveType`                 | `SICK`, `FAMILY`, `OTHER`                                                                      |
| `LeaveStatus`               | `PENDING`, `APPROVED`, `REJECTED`                                                              |
| `Shift`                     | `MORNING`, `AFTERNOON`, `FULL_DAY`                                                             |
| `TuitionInvoiceStatus`      | `UNPAID`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELED`                                             |
| `TuitionPaymentMethod`      | `CASH`, `BANK_TRANSFER`, `VNPAY`                                                               |
| `AnnouncementAudience`      | `ALL`, `PARENTS`, `TEACHERS`, `CLASS`                                                          |
| `MealType`                  | `BREAKFAST`, `LUNCH`, `SNACK`, `DINNER`                                                        |
| `NotificationType`          | `ATTENDANCE`, `DAILY_REPORT`, `ANNOUNCEMENT`, `INVOICE`, `MEDICINE`, `LEAVE`, `INCIDENT`       |
| `BillingCycle`              | `MONTHLY`, `QUARTERLY`, `ANNUAL`                                                               |
| `BillingCurrency`           | `VND`, `USD`                                                                                   |
| `LimitMetric`               | `STUDENTS`, `TEACHERS`, `CLASSROOMS`, `SCHOOLS`, `STORAGE_MB`, `PUSH_PER_MONTH`, `ADMIN_USERS` |
| `LimitEnforcement`          | `HARD`, `SOFT`                                                                                 |
| `PlatformPaymentProvider`   | `VNPAY`, `MOMO`, `BANK_TRANSFER`, `MANUAL`                                                     |
| `CouponDuration`            | `ONCE`, `REPEATING`, `FOREVER`                                                                 |
| `DiscountKind`              | `PERCENT`, `FIXED_AMOUNT`                                                                      |
| `PostStatus`                | `DRAFT`, `PUBLISHED`, `ARCHIVED`                                                               |

`Date` trong request body dùng chuỗi `YYYY-MM-DD`; `DateTime` dùng ISO string.

---

## Public

| Method | Path                                           | Body / Query                                                                  | Data trả về                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/public/plans`                                | -                                                                             | gói ĐẠI DIỆN mỗi tier (`isPublic && isActive && isFeatured` — BL-050, 1 gói/tier) (`id/code/tier/name/description/trialDays/sortOrder`) + `prices[]`, `features[]`, `limits[]`; không trả counter/nội bộ/plan ẩn                                                                                                                                                                                                 |
| `POST` | `/public/signup`                               | Body `SignupInput` (gồm `taxCode` **bắt buộc** + `acceptConsent: true` **bắt buộc** — BL-046) | luôn tạo tenant gói `free` ACTIVE. Nếu gửi `planCode` trả phí + `billingCycle`, trả thêm `selectedPlan`, `upgradeInvoice`, `publicInvoiceUrl`; gói trả phí chỉ kích hoạt sau khi platform admin mark-paid. Ghi nhận consent chủ trường (TERMS+PRIVACY hiệu lực + IP/UA). Lỗi: `VALIDATION_FAILED` nếu thiếu `acceptConsent`; `INVALID_TAX_CODE` (400), `TAX_CODE_TAKEN` (409), `SLUG_UNAVAILABLE` (400), `NO_PUBLIC_PRICE`                              |
| `GET`  | `/public/legal`                                | -                                                                             | **BL-046** văn bản pháp lý đang hiệu lực (TERMS + PRIVACY): `id/type/version/locale/title/summary/body/effectiveFrom`. Landing/app đọc để render + tick đồng ý                                                                                                                                                                                                                                                    |
| `GET`  | `/public/availability?slug=`                   | Query `slug: string`                                                          | `{ available: boolean }`                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET`  | `/public/tenants?q=`                           | Query `q?: string` (tùy chọn)                                                 | Danh sách trường để **chọn ở dropdown** login (độc lập subdomain). `q` rỗng → trả danh sách (sắp theo tên); có `q` → lọc theo tên/`code`/**MST**. Mảng item **chỉ field an toàn**: `{ id, code, slug, displayName, logoUrl, primaryDomain }` (**cap 50**, ẩn tenant `SUSPENDED`/đã xoá). **Cho tìm theo MST nhưng KHÔNG trả `taxCode`** ra payload (tránh thu thập MST hàng loạt); cũng KHÔNG lộ gói/email/bank |
| `GET`  | `/public/branding?host=`                       | Query `host: string`                                                          | branding/settings theo host                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET`  | `/public/platform-invoices/:token`             | `token` = `PlatformInvoice.publicToken` (uuid khó đoán)                       | hóa đơn để xem + thanh toán VietQR **không cần đăng nhập** (link chia sẻ cho trường). Trả như `/platform/invoices/:id` nhưng **bỏ `id`/`publicToken`**; 404 nếu token sai                                                                                                                                                                                                                                       |
| `GET`  | `/public/posts?page=&pageSize=&category=&tag=` | query optional                                                                | paginated bài `PUBLISHED`, `publishedAt <= now`, chưa xóa. Card fields: `slug/title/excerpt/coverImageUrl/category/tags/publishedAt`; `coverImageUrl` trả URL tuyệt đối từ API nếu là asset public nội bộ                                                                                                                                                                                                       |
| `GET`  | `/public/posts/:slug`                          | slug                                                                          | chi tiết bài public + `contentMarkdown`, SEO fields; draft/unpublished/archived trả 404; `coverImageUrl` cùng quy tắc URL public như list                                                                                                                                                                                                                                                                       |
| `GET`  | `/public/assets/blog/:file`                    | `file` = `*.webp/*.jpg/*.png/*.avif` an toàn                                  | raw image public cho cover blog/landing, serve từ `kids-api/public/blog`, cache `immutable`; 404 nếu file sai/không tồn tại                                                                                                                                                                                                                                                                                     |

`SignupInput`:

```ts
{
  schoolName: string;      // 2..120
  slug: string;            // 3..32
  code?: string;           // 3..20 — mã trường; bỏ trống → tự sinh từ slug (uppercase chữ/số, unique). Lỗi: INVALID_CODE/CODE_TAKEN
  taxCode: string;         // MST 10/13 số, đúng checksum (bắt buộc)
  adminEmail: string;      // email
  adminPassword: string;   // min 8
  adminFullName: string;   // 2..120
  phone?: string;          // max 20
  planCode?: string;       // default "free"; chỉ nhận plan public/active
  billingCycle?: BillingCycle; // default MONTHLY
}
```

Ghi chú: signup luôn tạo tenant gói `free` ở trạng thái `ACTIVE`, không trial. `planCode` trả phí chỉ tạo hóa đơn nâng cấp OPEN; subscription vẫn là Free tới khi hóa đơn được đánh dấu PAID.

## Auth

| Method | Path            | Body                       | Data trả về                                                                        |
| ------ | --------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `POST` | `/auth/login`   | `LoginInput`               | `{ accessToken, userId }` + **Set-Cookie `kk_rt`** (refresh token, HttpOnly)       |
| `POST` | `/auth/refresh` | _(trống — đọc cookie)_     | `{ accessToken }` + Set-Cookie `kk_rt` mới (rotate)                                 |
| `POST` | `/auth/logout`  | _(trống — đọc cookie)_     | `{ ok: true }` + xóa cookie `kk_rt`                                                |
| `GET`  | `/auth/me`      | Bearer                     | `{ id, type, tenantId, platformRole, fullName, phone, roles[], allowedSchoolIds, features, pendingConsents[] }` (`features`={featureKey:bool}; `pendingConsents`=văn bản pháp lý hiệu lực user CHƯA đồng ý → FE hiện gate — BL-046) |
| `GET`  | `/consent/pending` | Bearer                  | **BL-046** văn bản user chưa đồng ý (light: `id/type/version/title/summary`)        |
| `POST` | `/consent/accept`  | Bearer `{ documentIds[] }` | **BL-046** ghi nhận đồng ý (kèm IP/User-Agent làm bằng chứng); `VALIDATION_FAILED` nếu rỗng, `CONSENT_DOC_INVALID` nếu doc hết hiệu lực |

> **Refresh token trong cookie HttpOnly.** Refresh token KHÔNG trả ra body (chống XSS đọc cắp credential dài hạn) mà đặt trong cookie `kk_rt` (`HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Secure` ở prod, host-only). Web FE gọi API same-origin (Vite proxy dev / nginx prod) nên cookie tự gửi kèm; `/auth/refresh` + `/auth/logout` đọc token từ cookie. Access token trả ra body và FE giữ **in-memory** (mất khi reload → gọi `/auth/refresh` bằng cookie để khôi phục). `SameSite=Lax` + refresh là `POST` ⇒ chặn CSRF.
>
> **Client không có cookie jar (native).** App React Native khai header **`x-client: native`** → `/auth/login` và `/auth/refresh` trả **thêm** `refreshToken` ở body (lưu SecureStore/Keychain) vì `fetch` native không giữ cookie như trình duyệt; `/auth/refresh` cũng chấp nhận `{ refreshToken }` ở body. Web KHÔNG gửi header này nên vẫn cookie-only (giữ nguyên hardening chống XSS). Refresh token rotate mỗi lần → native phải dùng token mới ở body cho lần sau, nếu không reuse-detection thu hồi cả họ.
>
> **Rate limit:** `/auth/login` + `/auth/refresh` bị giới hạn chặt (mặc định **5 lần/60s/IP**, cấu hình `AUTH_THROTTLE_LIMIT`/`AUTH_THROTTLE_TTL_MS`) → vượt trả **429**. Các route khác dùng limit chung (`THROTTLE_LIMIT` mặc định 120/60s).
>
> **Account lockout:** sai mật khẩu ≥ `AUTH_LOCKOUT_THRESHOLD` (10) lần liên tiếp/tài khoản → khóa `AUTH_LOCKOUT_MINUTES` (15) phút, trả **401 `ACCOUNT_LOCKED`** (kể cả khi sau đó nhập đúng). Đăng nhập thành công reset bộ đếm.
>
> **Token:** access JWT ký **HS256**, TTL 15m, mang claim `tv` (tokenVersion) — reset mật khẩu bump `tokenVersion` → access token cũ **401 `INVALID_TOKEN`** ngay. Refresh token 48-byte ngẫu nhiên, hash SHA-256, **rotation** mỗi lần refresh theo `familyId`; dùng lại token đã rotate (reuse) → **revoke cả họ token** (401 `INVALID_REFRESH`).

`LoginInput`:

```ts
{
  identifier?: string; // email hoặc phone
  email?: string;      // giữ tương thích cũ
  password: string;
}
```

Cần có `identifier` hoặc `email`. Với tenant user, host phải khớp tenant của token; sai host trả `TENANT_MISMATCH`.

**Xác định tenant (độc lập subdomain).** Thứ tự resolve ở `TenantResolutionMiddleware`: `SILO env → Host(domain) → header x-tenant → JWT`. Header **`x-tenant: <tenantId>`** cho phép client (app native/web không qua subdomain) chọn trường ở login: chọn từ `/public/tenants` rồi gửi `x-tenant` khi `POST /auth/login`. Bảo mật: `x-tenant` chỉ _seed_ ctx **trước auth**; sau khi có token, `tenantId` trong token là nguồn sự thật và `TenantGuard` chặn nếu `x-tenant` ≠ tenant của token (`TENANT_MISMATCH`) → không thể vượt tenant. Request đã đăng nhập **không cần** gửi `x-tenant`. Thiếu cả Host lẫn `x-tenant` khi login tenant → `TENANT_REQUIRED`.

---

## Tenant Self-Service

Role: `AD`, `HT`. Host: tenant.

| Method  | Path                               | Body / Query            | Data trả về                                                                               |
| ------- | ---------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `GET`   | `/tenant/settings`                 | -                       | `TenantSettings`                                                                          |
| `PATCH` | `/tenant/settings`                 | `TenantSettingsPatch`   | `TenantSettings` sau cập nhật                                                             |
| `GET`   | `/tenant/schools?page=&pageSize=`  | optional                | paginated `School[]`                                                                      |
| `POST`  | `/tenant/schools`                  | `SchoolInput`           | `School`                                                                                  |
| `GET`   | `/tenant/members?page=&pageSize=&search=&role=&isActive=&staffOnly=`  | `search?` (fullName/email/phone, contains, insensitive); `role?: TenantRole`; `isActive?: true\|false`; `staffOnly?: true\|false` (loại `PARENT`) | paginated users (id,email,phone,fullName,isActive) + memberships, mới nhất trước          |
| `POST`  | `/tenant/members`                  | `CreateMemberInput`     | user mới + membership                                                                     |
| `PATCH` | `/tenant/members/:userId/status`   | `{ isActive: boolean }` | user sau cập nhật                                                                         |
| `PATCH` | `/tenant/members/:userId/password` | `{ password: string }`  | `{ id, passwordReset: true }` — đặt lại mật khẩu, revoke refresh token hiện có, ghi audit |
| `GET`   | `/tenant/domains?page=&pageSize=`  | optional                | paginated `TenantDomain[]`                                                                |
| `POST`  | `/tenant/domains`                  | `{ host: string }`      | domain PENDING + `verifyToken`                                                            |
| `POST`  | `/tenant/domains/:id/verify`       | -                       | domain ACTIVE nếu verify OK                                                               |

`TenantSettingsPatch`:

```ts
{
  displayName?: string;        // 1..120
  logoUrl?: string;            // url
  faviconUrl?: string;         // url
  primaryColor?: string;       // max 20
  secondaryColor?: string;     // max 20
  emailFromName?: string;      // max 120
  supportEmail?: string;       // email
  locale?: string;             // max 10
  timezone?: string;           // max 40
  taxCode?: string;            // max 20
  invoiceAddress?: string;     // max 200
  bankBin?: string;            // 6 số napas
  bankAccountNumber?: string;  // max 30
  bankAccountName?: string;    // max 120
}
```

`SchoolInput`:

```ts
{ name: string; code: string; address?: string; phone?: string }
```

`CreateMemberInput`:

```ts
{
  email?: string;
  phone?: string;       // /^(0|\+84)\d{8,10}$/
  fullName: string;     // 2..120
  role: TenantRole;
  schoolId?: string | null;
  password: string;     // min 8
}
```

Cần `email` hoặc `phone`. Tạo GV/HS có thể vướng quota theo gói. Lỗi thường gặp: `MEMBER_EXISTS`, `QUOTA_EXCEEDED`, `NO_USER`, `NO_SCHOOL`.

---

## Billing Self-Service

Role: `AD`, `KT`. Host: tenant. Các endpoint có ghi Inactive-OK vẫn gọi được khi subscription đang inactive/suspended.

| Method | Path                                | Body / Query                                   | Data trả về                                                                                                                                                                                            |
| ------ | ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/billing/plans`                    | Inactive-OK                                    | public plans + prices/features/limits                                                                                                                                                                  |
| `GET`  | `/billing/subscription`             | Inactive-OK                                    | subscription + plan + entitlements                                                                                                                                                                     |
| `GET`  | `/billing/usage`                    | Inactive-OK                                    | usage counters/quota hiện tại                                                                                                                                                                          |
| `GET`  | `/billing/invoices?page=&pageSize=` | Inactive-OK                                    | paginated `PlatformInvoice[]` + lines                                                                                                                                                                  |
| `POST` | `/billing/subscription/change`      | `{ planId: uuid, billingCycle: BillingCycle }` | subscription sau đổi gói. **BL-050**: gói TRẢ PHÍ phải là gói ĐANG BÁN (`isPublic && isActive && isFeatured`) → 400 `INVALID_PLAN` nếu là bản cũ; gói Free (tier FREE) được miễn (luôn cho downgrade về Free) |
| `POST` | `/billing/subscription/cancel`      | `{ atPeriodEnd?: boolean }`                    | subscription sau cancel                                                                                                                                                                                |
| `POST` | `/billing/invoices/:id/pay`         | `{ provider: "VNPAY" }`                        | `PlatformPayment` + `redirectUrl` VNPay theo env (`VNPAY_PAY_URL`/`VNPAY_RETURN_URL`); thiếu cấu hình trả `VNPAY_NOT_CONFIGURED`. `MOMO`/`BANK_TRANSFER`/`MANUAL` chưa hỗ trợ qua endpoint gateway này |

---

## Platform Admin

Host: `admin.<ROOT_DOMAIN>`. Role platform chính: `PLATFORM_SUPER_ADMIN`, `PLATFORM_BILLING`; một số route nội dung landing cho phép thêm `PLATFORM_SUPPORT` (ghi rõ ở từng dòng).

| Method   | Path                                                  | Body / Query                                                                                                                                                                                                            | Data trả về                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/platform/overview`                                  | -                                                                                                                                                                                                                       | dashboard console: `{ kpis{tenants,activeTenants,trialTenants,overdueInvoices,suspendedTenants,mrr}, mrrSeries[12], mrrGrowthPct, planDistribution[], recentTenants[], recentOverdue[] }`. `overdueInvoices`/`recentOverdue` = HĐ **chưa trả & quá hạn theo ngày** (OPEN/OVERDUE, dueAt<now, còn nợ) — **khớp worklist**, không chờ cron                                                                                                                                                                                                                                                                                                                                                                   |
| `GET`    | `/platform/revenue?months=`                           | `months?: 1..24` (mặc định 12, kẹp ≤24)                                                                                                                                                                                 | `{ months, series:[{period,month,value,source}], growthPct }` — chuỗi MRR theo tháng (`source`: `CRON` số thực \| `BACKFILL` \| `DERIVED` suy ngược)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST`   | `/platform/mrr/backfill?months=`                      | `months?: number` (mặc định 24); **chỉ `PLATFORM_SUPER_ADMIN`**                                                                                                                                                         | `{ ok, written }` — backfill snapshot các tháng còn thiếu (không đè số thực)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET`    | `/platform/tenants?page=&status=&q=&planTier=&quota=` | `page?`, `status?: TenantStatus`, `q?` (slug/legalName/displayName), `planTier?: PlanTier` (lọc theo gói qua subscription.plan.tier), `quota?` (`at-risk` = lọc trường dùng >=80% một hạn mức hữu hạn, theo usage thật) | paginated tenant list — mỗi dòng kèm `planTier`, `billingCycle`, `studentCount` (HS active), `mrr` (VND/tháng) + `quota[]` (used/limit của `STUDENTS/TEACHERS/CLASSROOMS/STORAGE_MB` cho cột "Hạn mức"; limit `null`=∞); `meta{page,pageSize,total}`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET`    | `/platform/search?q=`                                 | `q?: string`                                                                                                                                                                                                            | tìm nhanh (ô search Tổng quan): `{ tenants:[{id,slug,name,status}], invoices:[{id,invoiceNumber,tenantId,tenantName,status,total}] }` — top 5 mỗi loại                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET`    | `/platform/tenants/stats`                             | -                                                                                                                                                                                                                       | đếm tenant theo trạng thái: `{ total, ACTIVE, TRIAL, PAST_DUE, SUSPENDED }` (cho chip lọc)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `POST`   | `/platform/tenants`                                   | `PlatformCreateTenantInput`                                                                                                                                                                                             | `{ tenant, school, admin, subscription }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GET`    | `/platform/tenants/:id`                               | -                                                                                                                                                                                                                       | tenant detail + settings/domains/subscription/invoices; **bổ sung**: `mrr`, `studentCount`, `quota[{metric,used,limit,enforcement}]` (STUDENTS/TEACHERS/CLASSROOMS/STORAGE_MB), `schools[]` kèm `_count{students,classrooms}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `POST`   | `/platform/tenants/:id/suspend`                       | -                                                                                                                                                                                                                       | `{ ok: true }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `POST`   | `/platform/tenants/:id/reactivate`                    | -                                                                                                                                                                                                                       | `{ ok: true }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `POST`   | `/platform/tenants/:id/entitlements`                  | `EntitlementOverrideInput`                                                                                                                                                                                              | `TenantEntitlement`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST`   | `/platform/tenants/:id/impersonate`                   | -                                                                                                                                                                                                                       | tenant admin access token, no refresh token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET`    | `/platform/subscriptions?page=&status=`               | `page?: number`, `status?: SubscriptionStatus`                                                                                                                                                                          | paginated subscriptions — mỗi dòng kèm `tenantName`, `tenantSlug`, `billingCycle`, `autoRenew` (=`!cancelAtPeriodEnd`), `mrr` (VND/tháng); `meta{page,pageSize,total}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET`    | `/platform/subscriptions/stats`                       | -                                                                                                                                                                                                                       | đếm thuê bao theo trạng thái: `{ total, TRIALING, ACTIVE, PAST_DUE, SUSPENDED, CANCELED, EXPIRED }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET`    | `/platform/invoices?page=&tenantId=&status=&q=`       | `status`: **`OPEN`=mọi HĐ chưa trả (OPEN/OVERDUE)**, **`OVERDUE`=chưa trả + quá hạn theo NGÀY** (dueAt<now, không chờ cron), `PAID`/`VOID`=đúng status; `q` tìm `invoiceNumber`                                         | paginated — mỗi dòng kèm `tenantName`, `period`, `dueDate`, `amountDue`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GET`    | `/platform/invoices/stats`                            | -                                                                                                                                                                                                                       | KPI tiền: `{ paidThisMonth, openAmount (mọi HĐ chưa trả), overdueAmount (chưa trả + quá hạn theo ngày, subset), total }` — khớp Worklist/Tổng quan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `POST`   | `/platform/invoices`                                  | `{ tenantId: string }`                                                                                                                                                                                                  | created platform invoice — `invoiceNumber` định dạng **`{SLUG}-{MÃ_GÓI}-{YYYYMMDD}-{NN}`** (vd `DEMO-PRO-20260625-01`): slug trường + mã gói + ngày lập, để đối soát chuyển khoản (addInfo VietQR = số HĐ)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GET`    | `/platform/invoices/:id`                              | -                                                                                                                                                                                                                       | chi tiết 1 hóa đơn (trang chi tiết/in): `{ invoiceNumber, status, lines[], subtotal/discount/tax/total/amountPaid/amountDue, buyer{name,taxCode,address}, seller{name}, bank{bin,accountNumber,accountName}, publicToken }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `POST`   | `/platform/invoices/:id/mark-paid`                    | `{ amount?: number }`                                                                                                                                                                                                   | đánh dấu đã thu — **không truyền `amount` = trả đủ** (`amountPaid=total`). HĐ kỳ thường: reactivate + đẩy kỳ. HĐ `SIGNUP_UPGRADE`: đổi `Subscription.planId/billingCycle`, reset kỳ, clear entitlement cache, ghi `SubscriptionChange.UPGRADE`                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `GET`    | `/platform/plans`                                     | -                                                                                                                                                                                                                       | all plans (kèm `prices/features/limits/trialDays`) — mỗi gói **bổ sung** `tenantCount` (số thuê bao đang chạy: status TRIALING/ACTIVE/PAST_DUE)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `POST`   | `/platform/plans`                                     | `CreatePlanInput`                                                                                                                                                                                                       | created plan + nested config                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `PATCH`  | `/platform/plans/:id`                                 | `UpdatePlanInput` (name/description/isPublic/isActive/isFeatured/trialDays/sortOrder + upsert prices/features/limits theo unique key)                                                                                   | plan sau cập nhật; **không** đổi `code`/`tier`; **BL-050**: gói đã có thuê bao mà request **thực sự đổi** prices/features/limits → 400 `PLAN_IMMUTABLE` (gửi lại đúng giá trị hiện tại = no-op vẫn OK); `isActive=false`/`isPublic=false` **tự clear `isFeatured`**; 404 `PLAN_NOT_FOUND` nếu không thấy                                                                                                                                                                                                                                                                                                                                                                                                          |
| `PATCH`  | `/platform/plans/:id/feature`                         | -                                                                                                                                                                                                                       | **BL-050** đặt gói làm **đại diện** (featured) của tier — tự bỏ featured gói cũ cùng tier; 400 `PLAN_NOT_SELLABLE` nếu gói không active+public                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `PATCH`  | `/platform/plans/:id/deactivate`                      | -                                                                                                                                                                                                                       | **BL-050** ngừng bán gói (`isActive=false` + bỏ featured)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `DELETE` | `/platform/plans/:id`                                 | -                                                                                                                                                                                                                       | **BL-050** soft-delete gói; 400 `PLAN_HAS_SUBSCRIPTIONS` nếu còn thuê bao tham chiếu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET`    | `/platform/posts?page=&status=&q=`                    | `PLATFORM_SUPER_ADMIN`/`PLATFORM_SUPPORT`                                                                                                                                                                               | paginated bài landing, lọc status/search title/slug/category                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST`   | `/platform/posts`                                     | `PlatformPostInput`                                                                                                                                                                                                     | tạo bài nháp/published                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET`    | `/platform/posts/:id`                                 | -                                                                                                                                                                                                                       | chi tiết bài                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `PATCH`  | `/platform/posts/:id`                                 | `Partial<PlatformPostInput>`                                                                                                                                                                                            | cập nhật bài                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST`   | `/platform/posts/:id/publish`                         | -                                                                                                                                                                                                                       | set `PUBLISHED`, `publishedAt=now`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `POST`   | `/platform/posts/:id/unpublish`                       | -                                                                                                                                                                                                                       | chuyển về `DRAFT`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `DELETE` | `/platform/posts/:id`                                 | -                                                                                                                                                                                                                       | soft-delete + `ARCHIVED`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `GET`    | `/platform/coupons?page=&isActive=`                   | `page?`, `isActive?: bool`                                                                                                                                                                                              | paginated coupons — mỗi dòng đủ field UI (`kind/amount/duration/durationCount/maxRedemptions/redeemedCount/validUntil/isActive`); `meta{page,pageSize,total}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `POST`   | `/platform/coupons`                                   | `CreateCouponInput` (`code` upper, `kind`, `amount`, `duration?`, `durationCount?`, `maxRedemptions?`, `validFrom?/validUntil?`, `isActive?`)                                                                           | created coupon; 400 `VALIDATION_FAILED` (thiếu code / amount ≤ 0 / % > 100 / hạn sai)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET`    | `/platform/settings`                                  | -                                                                                                                                                                                                                       | `PlatformConfig` (singleton): `bankBin/bankAccountNumber/bankAccountName` (VietQR) + `pastDueGraceDays/suspendedGraceDays`; tạo mặc định từ ENV nếu chưa có                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `PATCH`  | `/platform/settings`                                  | scalar fields; **chỉ `PLATFORM_SUPER_ADMIN`**                                                                                                                                                                           | `PlatformConfig` sau cập nhật — grace days là **nguồn sự thật** cho `billing-jobs` dunning (ENV chỉ là giá trị khởi tạo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `GET`    | `/platform/worklist`                                  | -                                                                                                                                                                                                                       | `{ trial:{active,expiringSoon,endedTotal,converted,conversionRate,items[]}, quota:{thresholdPct,atRisk,tenants}, dunning:{overdueCount,overdueAmount,atRiskSuspend,suspended,items[]} }` — trang **Cần hành động**: phễu trial (TRIALING + conversion = trial kết thúc KHÔNG thành EXPIRED) + KPI quota (số dòng tenant×metric >=80% `atRisk` / số trường distinct `tenants`, theo usage thật `STUDENTS/TEACHERS/CLASSROOMS/STORAGE_MB` — **KHÔNG tính SCHOOLS** vì gói 1 cơ sở luôn 100%) + công nợ (HĐ OPEN/OVERDUE quá hạn còn nợ, resolve tenantName + subStatus). **Quota chỉ trả KPI** (payload nhẹ) — bấm KPI mở danh sách ở `/platform/tenants?quota=at-risk`; engine dunning vẫn ở `billing-jobs` |
| `GET`    | `/platform/usage/overview`                            | -                                                                                                                                                                                                                       | `{ tenants, activeTenants, users, dau, wau, mau, topEvents }` — KPI hoạt động cho trang **Theo dõi vận hành**; `dau/wau/mau` = user riêng biệt có `login` trong 1/7/30 ngày                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET`    | `/platform/audit?page=&tenantId=&action=`             | `page?`, `tenantId?`, `action?` (contains, insensitive)                                                                                                                                                                 | paginated AuditLog — mỗi dòng resolve `tenantName` + `actorName/actorEmail`, kèm `actorType/action/targetType/targetId/ip/createdAt`; `meta{page,pageSize,total}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

`PlatformCreateTenantInput` dùng cùng schema với `SignupInput` nhưng chỉ dành cho platform console:

```ts
{
  schoolName: string;
  slug: string;
  code?: string;
  taxCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
  planCode?: string;
  billingCycle?: BillingCycle;
}
```

`POST /platform/tenants/:id/impersonate` chỉ cho `PLATFORM_SUPER_ADMIN`, chọn SCHOOL_ADMIN active đầu tiên của tenant, ghi audit `platform.tenant.impersonate`, và trả access token ngắn hạn không kèm refresh token.

`CreatePlanInput`:

```ts
{
  code: string;
  name: string;
  tier: PlanTier;
  description?: string;
  isPublic?: boolean;
  trialDays?: number;
  sortOrder?: number;
  prices?: Array<{
    billingCycle: BillingCycle;
    currency?: BillingCurrency;
    amount: number;
  }>;
  features?: Array<{
    featureKey: string;
    enabled?: boolean;
  }>;
  limits?: Array<{
    metric: LimitMetric;
    limitValue: number | null; // null = unlimited
    enforcement?: LimitEnforcement;
  }>;
}
```

`CreateCouponInput`:

```ts
{
  code: string;                    // lưu uppercase
  kind: DiscountKind;              // PERCENT hoặc FIXED_AMOUNT
  amount: number;                  // PERCENT: 0 < amount <= 100
  currency?: BillingCurrency;      // thường dùng cho FIXED_AMOUNT
  duration?: CouponDuration;       // default ONCE
  durationCount?: number;
  maxRedemptions?: number;
  validFrom?: string;              // DateTime
  validUntil?: string;             // DateTime, phải sau validFrom
  isActive?: boolean;              // default true
}
```

`EntitlementOverrideInput` nhận một hoặc nhiều field theo model `TenantEntitlement`:

```ts
{
  subscriptionId?: string;
  featureKey?: string;
  enabled?: boolean;
  metric?: LimitMetric;
  limitValue?: number | null;
  reason?: string;
  expiresAt?: string;
}
```

Webhook platform:

| Method | Path                           | Body / Header                                                                | Data trả về                                                                                          |
| ------ | ------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST` | `/platform/webhooks/:provider` | provider hiện hỗ trợ: `vnpay`; header `x-signature` hoặc `payload.signature` | `{ ok: true }`, `{ ok: true, deduped: true }`, hoặc error `INVALID_SIGNATURE`/`UNSUPPORTED_PROVIDER` |

---

## B — Hồ sơ & Tổ Chức

### Classrooms

| Method   | Path                                    | Role  | Body / Query      | Data trả về                    |
| -------- | --------------------------------------- | ----- | ----------------- | ------------------------------ |
| `GET`    | `/classrooms?page=&pageSize=&schoolId=` | STAFF | `schoolId?: uuid` | paginated `Classroom[]` scoped |
| `GET`    | `/classrooms/:id`                       | STAFF | -                 | `Classroom`                    |
| `POST`   | `/classrooms`                           | AD,HT | `ClassroomCreate` | `Classroom`                    |
| `PATCH`  | `/classrooms/:id`                       | AD,HT | `ClassroomPatch`  | `Classroom`                    |
| `DELETE` | `/classrooms/:id`                       | AD,HT | -                 | `{ ok: true }`                 |

```ts
type ClassroomCreate = {
  schoolId: string;
  name: string; // 1..120
  ageGroup?: string; // max 40
  capacity?: number; // 1..200
  homeroomTeacherId?: string;
};
type ClassroomPatch = Partial<Omit<ClassroomCreate, "schoolId">> & {
  homeroomTeacherId?: string | null;
  isActive?: boolean;
};
```

Tạo lớp KHÔNG tính quota theo gói (số lớp không phải chiều tính gói — BL-049). Delete là soft-delete.

### Students

| Method   | Path                                               | Role     | Body / Query     | Data trả về                                 |
| -------- | -------------------------------------------------- | -------- | ---------------- | ------------------------------------------- |
| `GET`    | `/students/mine?page=&pageSize=`                   | PH       | optional         | paginated children của PH                   |
| `GET`    | `/students?page=&pageSize=&classroomId=&schoolId=&gender=&search=` | STAFF    | `gender?: Gender`; `search?` (fullName/nickname, contains, insensitive) | paginated `Student[]` (+ parents/classroom) |
| `GET`    | `/students/:id`                                    | STAFF    | -                | `Student` + parents/classroom               |
| `POST`   | `/students`                                        | AD,HT,GV | `StudentCreate`  | `Student`                                   |
| `PATCH`  | `/students/:id`                                    | AD,HT,GV | `StudentPatch`   | `Student`                                   |
| `DELETE` | `/students/:id`                                    | AD,HT,GV | -                | `{ ok: true }`                              |
| `POST`   | `/students/:id/guardians`                          | AD,HT,GV | `GuardianInput`  | `StudentParent`                             |
| `DELETE` | `/students/:id/guardians/:parentId`                | AD,HT,GV | -                | `{ ok: true }`                              |

```ts
type GuardianInput = {
  parentId: string;
  relationship: string; // 1..40
  isPrimary?: boolean;
};
type StudentCreate = {
  schoolId: string;
  classroomId?: string;
  fullName: string; // 1..120
  nickname?: string; // max 60
  dateOfBirth: string; // YYYY-MM-DD
  gender: Gender;
  avatarUrl?: string;
  guardians?: GuardianInput[];
};
type StudentPatch = {
  classroomId?: string | null;
  fullName?: string;
  nickname?: string;
  dateOfBirth?: string;
  gender?: Gender;
  avatarUrl?: string;
  status?: StudentStatus;
};
```

Create check quota `STUDENTS`. PH chỉ truy cập con mình qua các endpoint cho phép PH.

---

## C — Vận Hành Ngày

### Attendance

| Method | Path                                             | Role     | Body / Query          | Data trả về                              |
| ------ | ------------------------------------------------ | -------- | --------------------- | ---------------------------------------- |
| `POST` | `/attendance/mark`                               | AD,HT,GV | `AttendanceMarkInput` | `Attendance[]` upsert theo học sinh/ngày |
| `GET`  | `/attendance?page=&pageSize=&classroomId=&date=` | STAFF    | required query        | paginated `Attendance[]`                 |
| `GET`  | `/attendance/student/:studentId?page=&pageSize=` | STAFF,PH | optional              | paginated history của học sinh           |

```ts
type AttendanceMarkInput = {
  classroomId: string;
  date: string; // YYYY-MM-DD
  entries: Array<{
    studentId: string;
    status: AttendanceStatus;
    checkInAt?: string; // DateTime
    note?: string; // max 300
  }>;
};
```

### Daily Reports

| Method | Path                                                | Role     | Body / Query             | Data trả về                        |
| ------ | --------------------------------------------------- | -------- | ------------------------ | ---------------------------------- |
| `POST` | `/daily-reports`                                    | AD,HT,GV | `DailyReportUpsertInput` | `DailyReport`                      |
| `GET`  | `/daily-reports?page=&pageSize=&classroomId=&date=` | STAFF    | required query           | paginated `DailyReport[]`          |
| `GET`  | `/daily-reports/student/:studentId?page=&pageSize=` | STAFF,PH | optional                 | paginated report feed của học sinh |

```ts
type DailyReportUpsertInput = {
  studentId: string;
  date: string; // YYYY-MM-DD
  mood?: Mood;
  meals?: string; // max 500
  nap?: string; // max 500
  activities?: string; // max 500
  note?: string; // max 1000
  photoIds?: string[]; // max 12 Media id, ảnh đã upload qua POST /media
};
```

Upsert unique theo `(studentId, date)`. Nếu truyền `photoIds`, backend thay toàn bộ danh sách ảnh của báo cáo bằng các media đó và trả về `photos[]` kèm metadata `media`. Notification chỉ phát khi tạo mới.

### Pickup / Drop-off

Role: `STAFF` xem/ghi; `PH` xem dữ liệu của con mình.

| Method  | Path                                                        | Role        | Body / Query                | Data trả về                       |
| ------- | ----------------------------------------------------------- | ----------- | --------------------------- | --------------------------------- |
| `GET`   | `/pickup/authorizations?page=&pageSize=&studentId=&status=` | STAFF,PH    | filters optional            | paginated `PickupAuthorization[]` |
| `POST`  | `/pickup/authorizations`                                    | AD,HT,GV,YT | `PickupAuthorizationCreate` | `PickupAuthorization`             |
| `PATCH` | `/pickup/authorizations/:id/revoke`                         | AD,HT,GV,YT | -                           | authorization status `REVOKED`    |
| `GET`   | `/pickup/logs?page=&pageSize=&studentId=`                   | STAFF,PH    | filter optional             | paginated `PickupLog[]`           |
| `POST`  | `/pickup/logs`                                              | AD,HT,GV,YT | `PickupLogCreate`           | `PickupLog`                       |

```ts
type PickupAuthorizationCreate = {
  studentId: string;
  parentUserId?: string;
  guardianName: string;
  guardianPhone: string;
  relationship?: string;
  note?: string;
};
type PickupLogCreate = {
  studentId?: string;
  authorizationId?: string;
  eventType: PickupEventType;
  guardianName?: string;
  guardianPhone?: string;
  note?: string;
  occurredAt?: string; // DateTime, mặc định now
};
```

### Media

| Method | Path                     | Role           | Body / Query                                                                                                                                                                                                                                            | Data trả về                                                                                                                                                                                       |
| ------ | ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/media?kind=&schoolId=` | AD,HT,GV,YT    | multipart field `file`; max 15MB. Query validate Zod (`kind` ∈ MediaKind, `schoolId` uuid) → sai kiểu trả `VALIDATION_FAILED` (không 500). Có `schoolId` → user phải có quyền trên school đó (`SCHOOL_FORBIDDEN` nếu không) và school phải thuộc tenant | `{ id, url, mimeType, sizeBytes, width, height }`                                                                                                                                                 |
| `GET`  | `/media/:id/file`        | AD,HT,GV,YT,PH | -                                                                                                                                                                                                                                                       | raw stream `image/webp`/mimeType tương ứng; backend kiểm quyền theo tenant + school/ảnh đã upload hoặc quan hệ report/album mà người dùng được xem. KT không được tải media trẻ (least-privilege) |

Ảnh upload được nén về WebP, cạnh dài tối đa `MEDIA_MAX_DIM` (default 1280), check quota `STORAGE_MB`.

---

## D — Sức Khỏe

> **Least-privilege:** ở nhóm Sức Khỏe (health/medicine/incidents/allergies), `STAFF` = **AD/HT/GV/YT (KHÔNG gồm KT)** — kế toán không đọc/ghi dữ liệu sức khỏe trẻ. `KT` chỉ vận hành học phí/billing.

### Health Records

| Method | Path                                         | Role        | Body / Query        | Data trả về                            |
| ------ | -------------------------------------------- | ----------- | ------------------- | -------------------------------------- |
| `POST` | `/health`                                    | AD,HT,YT,GV | `HealthRecordInput` | `HealthRecord`                         |
| `GET`  | `/health/student/:studentId?page=&pageSize=` | STAFF,PH    | optional            | paginated `HealthRecord[]`             |
| `GET`  | `/health/student/:studentId/growth`          | STAFF,PH    | -                   | `{ height: Point[], weight: Point[] }` |

```ts
type HealthRecordInput = {
  studentId: string;
  date: string; // YYYY-MM-DD
  heightCm?: number; // >0, <=250
  weightKg?: number; // >0, <=150
  temperatureC?: number; // 30..45
  note?: string; // max 500
};
```

Cần ít nhất một chỉ số trong `heightCm`, `weightKg`, `temperatureC`.

### Medicine

| Method | Path                                | Role        | Body / Query              | Data trả về                     |
| ------ | ----------------------------------- | ----------- | ------------------------- | ------------------------------- |
| `POST` | `/medicine`                         | STAFF,PH    | `MedicineCreate`          | `MedicineRequest` PENDING       |
| `GET`  | `/medicine/mine?page=&pageSize=`    | PH          | optional                  | paginated requests của con mình |
| `GET`  | `/medicine?page=&pageSize=&status=` | STAFF       | `status?: MedicineStatus` | paginated `MedicineRequest[]`   |
| `GET`  | `/medicine/:id`                     | STAFF,PH    | -                         | request + status history        |
| `POST` | `/medicine/:id/handle`              | AD,HT,YT,GV | `MedicineHandle`          | updated request                 |

```ts
type MedicineCreate = {
  studentId: string;
  medicineName: string; // 1..200
  dosage: string; // 1..200
  schedule: string; // 1..200
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string; // max 500
};
type MedicineHandle = {
  status: MedicineStatus; // APPROVED, ADMINISTERED, REJECTED...
  note?: string; // max 500
};
```

### Incidents & Allergies & Leave

| Method   | Path                                            | Role        | Body / Query           | Data trả về                     |
| -------- | ----------------------------------------------- | ----------- | ---------------------- | ------------------------------- |
| `POST`   | `/incidents`                                    | AD,HT,GV,YT | `IncidentCreate`       | `Incident`                      |
| `GET`    | `/incidents?page=&pageSize=&studentId=`         | STAFF       | filter optional        | paginated `Incident[]`          |
| `GET`    | `/incidents/student/:studentId?page=&pageSize=` | STAFF,PH    | optional               | paginated `Incident[]`          |
| `POST`   | `/allergies`                                    | AD,HT,YT,GV | `AllergyCreate`        | `Allergy`                       |
| `GET`    | `/allergies/student/:studentId?page=&pageSize=` | STAFF,PH    | optional               | paginated `Allergy[]`           |
| `DELETE` | `/allergies/:id`                                | AD,HT,YT,GV | -                      | `{ ok: true }`                  |
| `POST`   | `/leave`                                        | STAFF,PH    | `LeaveCreate`          | `LeaveRequest` PENDING          |
| `GET`    | `/leave/mine?page=&pageSize=`                   | PH          | optional               | paginated requests của con mình |
| `GET`    | `/leave?page=&pageSize=&status=`                | STAFF       | `status?: LeaveStatus` | paginated `LeaveRequest[]`      |
| `GET`    | `/leave/:id`                                    | STAFF,PH    | -                      | `LeaveRequest`                  |
| `POST`   | `/leave/:id/decide`                             | AD,HT,GV    | `LeaveDecision`        | updated request                 |

```ts
type IncidentCreate = {
  studentId: string;
  date: string;
  type: string; // 1..100
  severity?: IncidentSeverity;
  description: string; // 1..2000
  actionTaken?: string; // max 2000
};
type AllergyCreate = {
  studentId: string;
  allergen: string; // 1..200
  note?: string; // max 500
};
type LeaveCreate = {
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string; // max 1000
  attachmentUrl?: string; // url, max 500
};
type LeaveDecision = {
  status: LeaveStatus; // APPROVED hoặc REJECTED trong nghiệp vụ
  note?: string; // max 500
};
```

Lỗi thường gặp: `NO_STUDENT`, `NO_REQUEST`, `ALREADY_DECIDED`, `DUPLICATE_ALLERGY`.

---

## B3 — Phân Công Nhân Sự

| Method   | Path                                                          | Role  | Body / Query       | Data trả về                      |
| -------- | ------------------------------------------------------------- | ----- | ------------------ | -------------------------------- |
| `GET`    | `/assignments/mine?page=&pageSize=`                           | STAFF | optional           | paginated lịch của user hiện tại |
| `GET`    | `/assignments?page=&pageSize=&staffId=&classroomId=&weekday=` | AD,HT | filters optional   | paginated `StaffAssignment[]`    |
| `POST`   | `/assignments`                                                | AD,HT | `AssignmentCreate` | `StaffAssignment`                |
| `PATCH`  | `/assignments/:id`                                            | AD,HT | `AssignmentPatch`  | `StaffAssignment`                |
| `DELETE` | `/assignments/:id`                                            | AD,HT | -                  | `{ ok: true }`                   |

```ts
type AssignmentCreate = {
  staffId: string;
  classroomId?: string;
  schoolId?: string;
  weekday: number; // 1..7, 1 = Thứ 2
  shift: Shift;
  duty: string; // 1..100
  note?: string; // max 300
};
type AssignmentPatch = {
  classroomId?: string | null;
  weekday?: number;
  shift?: Shift;
  duty?: string;
  note?: string;
};
```

Unique `(staffId, weekday, shift)`. Lỗi thường gặp: `NO_STAFF`, `DUPLICATE_ASSIGNMENT`.

---

## E — Học Phí

| Method | Path                                                   | Role        | Body / Query                                                    | Data trả về                                                                                                   |
| ------ | ------------------------------------------------------ | ----------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `POST` | `/tuition/invoices`                                    | AD,HT,KT    | `TuitionInvoiceCreate`                                          | invoice + items                                                                                               |
| `GET`  | `/tuition/invoices/mine?page=&pageSize=`               | PH          | optional                                                        | paginated invoices của con mình                                                                               |
| `GET`  | `/tuition/invoices?page=&pageSize=&status=&studentId=&search=` | STAFF       | filters optional; `search?` (invoiceNumber/student.fullName, contains, insensitive) | paginated `TuitionInvoice[]`                                                                                  |
| `GET`  | `/tuition/invoices/export?status=`                     | STAFF       | `status?: TuitionInvoiceStatus`                                 | raw CSV                                                                                                       |
| `GET`  | `/tuition/invoices/:id`                                | AD,HT,KT,PH | -                                                               | invoice + student/items/payments                                                                              |
| `GET`  | `/tuition/invoices/:id/print`                          | AD,HT,KT,PH | -                                                               | raw HTML chứng từ                                                                                             |
| `POST` | `/tuition/invoices/:id/cancel`                         | AD,HT,KT    | -                                                               | invoice status `CANCELED`                                                                                     |
| `POST` | `/tuition/invoices/:id/pay/manual`                     | AD,HT,KT    | `ManualPaymentInput`                                            | `TuitionPayment`                                                                                              |
| `GET`  | `/tuition/invoices/:id/vietqr`                         | AD,HT,KT,PH | -                                                               | `VietQrResponse`                                                                                              |
| `POST` | `/tuition/invoices/:id/pay/gateway`                    | AD,HT,KT,PH | `{ method: "VNPAY" }`                                           | `{ paymentId, gatewayRef, redirectUrl }`; thiếu `VNPAY_PAY_URL`/`VNPAY_RETURN_URL` trả `VNPAY_NOT_CONFIGURED` |
| `POST` | `/tuition/webhooks/:method`                            | public      | `method` hiện hỗ trợ: `vnpay`; payload gateway + `x-signature?` | `{ ok: true }`, `ignored`, `deduped`, hoặc error `INVALID_SIGNATURE`/`UNSUPPORTED_PROVIDER`                   |

```ts
type TuitionInvoiceCreate = {
  studentId: string;
  period: string; // 1..40, vd "2026-06"
  issueDate?: string;
  dueDate: string;
  discount?: number; // >=0
  note?: string; // max 500
  items: Array<{
    label: string; // 1..120
    quantity?: number; // 1..999, default service-side
    unitPrice: number; // >=0
  }>;
};
type ManualPaymentInput = {
  method: "CASH" | "BANK_TRANSFER";
  amount?: number; // default = remaining
  reference?: string; // max 120
};
type VietQrResponse = {
  payload: string; // EMVCo string
  bankBin: string;
  accountNumber: string;
  accountName?: string;
  amount: number;
  addInfo: string; // invoiceNumber sanitized
};
```

Lỗi thường gặp: `NO_INVOICE`, `NO_STUDENT`, `BAD_AMOUNT`, `ALREADY_PAID`, `CANCELED`, `HAS_PAYMENT`, `NOTHING_DUE`, `NO_BANK_CONFIG`, `INVALID_SIGNATURE`.

---

## F — Giao Tiếp & Nội Dung

### Announcements

| Method   | Path                                       | Role     | Body / Query                      | Data trả về                            |
| -------- | ------------------------------------------ | -------- | --------------------------------- | -------------------------------------- |
| `POST`   | `/announcements`                           | AD,HT,GV | `AnnouncementCreate`              | `Announcement`                         |
| `GET`    | `/announcements/feed?page=&pageSize=`      | STAFF,PH | optional                          | paginated feed theo audience/quyền xem |
| `GET`    | `/announcements?page=&pageSize=&audience=` | STAFF    | `audience?: AnnouncementAudience` | paginated `Announcement[]`             |
| `GET`    | `/announcements/:id`                       | STAFF,PH | -                                 | `Announcement`                         |
| `POST`   | `/announcements/:id/publish`               | AD,HT,GV | -                                 | `Announcement` published               |
| `DELETE` | `/announcements/:id`                       | AD,HT,GV | -                                 | `{ ok: true }`                         |

```ts
type AnnouncementCreate = {
  audience: AnnouncementAudience;
  schoolId?: string;
  classroomId?: string; // bắt buộc khi audience=CLASS
  title: string; // 1..200
  body: string; // 1..5000
  publish?: boolean;
};
```

### Menus, Lesson Plans, Albums

| Method   | Path                                               | Role                               | Body / Query       | Data trả về              |
| -------- | -------------------------------------------------- | ---------------------------------- | ------------------ | ------------------------ |
| `POST`   | `/menus`                                           | AD,HT,YT                           | `MenuCreate`       | menu + meals             |
| `GET`    | `/menus?page=&pageSize=&weekStart=&classroomId=`   | STAFF,PH                           | filters optional   | paginated `WeeklyMenu[]` |
| `GET`    | `/menus/:id`                                       | STAFF,PH                           | -                  | menu + meals             |
| `GET`    | `/menus/:id/allergy-warnings?studentId=`           | STAFF,PH                           | required studentId | allergy warning list     |
| `DELETE` | `/menus/:id`                                       | AD,HT,YT                           | -                  | `{ ok: true }`           |
| `POST`   | `/lesson-plans`                                    | AD,HT,GV + feature `lesson_plan`   | `LessonPlanCreate` | plan + activities        |
| `GET`    | `/lesson-plans?page=&pageSize=&classroomId=&week=` | AD,HT,GV + feature                 | filters optional   | paginated `LessonPlan[]` |
| `GET`    | `/lesson-plans/:id`                                | AD,HT,GV + feature                 | -                  | plan + activities        |
| `DELETE` | `/lesson-plans/:id`                                | AD,HT,GV + feature                 | -                  | `{ ok: true }`           |
| `POST`   | `/albums`                                          | AD,HT,GV + feature `media_gallery` | `AlbumCreate`      | `Album`                  |
| `POST`   | `/albums/:id/photos`                               | AD,HT,GV + feature                 | `AlbumPhotosInput` | created `AlbumPhoto[]`   |
| `GET`    | `/albums?page=&pageSize=&classroomId=`             | AD,HT,GV,YT,PH + feature           | filter optional    | paginated `Album[]`      |
| `GET`    | `/albums/:id`                                      | AD,HT,GV,YT,PH + feature           | -                  | album + photos/media     |
| `DELETE` | `/albums/photos/:photoId`                          | AD,HT,GV + feature                 | -                  | `{ ok: true }`           |
| `DELETE` | `/albums/:id`                                      | AD,HT,GV + feature                 | -                  | `{ ok: true }`           |

```ts
type MenuCreate = {
  weekStart: string; // YYYY-MM-DD
  schoolId?: string; // nếu truyền trực tiếp, user phải có quyền trên school này
  classroomId?: string; // nếu truyền classroomId, backend lấy schoolId từ lớp và kiểm school-scope
  note?: string; // max 500
  meals: Array<{
    weekday: number; // 1..7
    mealType: MealType;
    name: string; // 1..300
    ingredients?: string; // max 500
  }>;
};
type LessonPlanCreate = {
  classroomId: string;
  week: string; // 1..40, vd "2026-W27"
  theme: string; // 1..200
  note?: string; // max 1000
  activities?: Array<{
    dayOfWeek: number; // 1..7
    startTime?: string; // max 10
    title: string; // 1..200
    materials?: string; // max 500
  }>;
};
type AlbumCreate = {
  classroomId?: string;
  schoolId?: string; // nếu truyền trực tiếp, user phải có quyền trên school này
  title: string; // 1..200
  description?: string; // max 1000
};
type AlbumPhotosInput = {
  photos: Array<{ mediaId: string; caption?: string }>;
};
```

Lỗi thường gặp: `FEATURE_NOT_AVAILABLE`, `NO_MENU`, `NO_PLAN`, `NO_ALBUM`, `NO_MEDIA`, `NO_STUDENT`.

---

## G — Notifications, Dashboard, Audit

| Method  | Path                                                        | Role            | Body / Query                                 | Data trả về                                    |
| ------- | ----------------------------------------------------------- | --------------- | -------------------------------------------- | ---------------------------------------------- |
| `GET`   | `/notifications?page=&pageSize=&unreadOnly=true\|false`     | mọi tenant role | optional                                     | paginated `Notification[]` của user hiện tại   |
| `GET`   | `/notifications/unread-count`                   | mọi tenant role | -                                              | `{ count: number }`                   |
| `GET`   | `/notifications/preferences`                    | mọi tenant role | -                                              | preferences cho đủ `NotificationType` |
| `PATCH` | `/notifications/preferences`                    | mọi tenant role | `{ type: NotificationType, enabled: boolean }` | `NotificationPreference`              |
| `POST`  | `/notifications/read-all`                       | mọi tenant role | -                                              | batch update result                   |
| `POST`  | `/notifications/:id/read`                       | mọi tenant role | -                                              | `Notification` với `readAt`           |
| `GET`   | `/dashboard/summary`                            | AD,HT           | -                                              | dashboard summary                     |
| `GET`   | `/audit-logs?page=&pageSize=&action=&limit=`    | AD,HT           | `action?: string`, `pageSize/limit?: 1..100`   | paginated `AuditLog[]` newest first   |

`DashboardSummary`:

```ts
{
  students: number;
  classrooms: number;
  staff: number;
  attendanceToday: Record<AttendanceStatus, number>;
  pendingMedicine: number;
  pendingLeave: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  outstandingAmount: number;
  revenueThisMonth: number;
  attendanceTrend30d: Array<{ date: string; present: number }>;
  medicineThisMonth: Record<MedicineStatus, number>;
  medicineTotalThisMonth: number;
  revenueLast6Months: Array<{ period: string; month: string; amount: number }>;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    audience: AnnouncementAudience;
    classroomName: string | null;
    publishedAt: string | Date | null;
  }>;
}
```

Notification phát từ 6 sự kiện hiện có: tạo daily report, publish announcement, tạo incident, tạo tuition invoice, xử lý medicine, quyết định leave. Push FCM chưa có; `NotificationsService.notify` là điểm gắn sau.

---

## Mã Lỗi Chung

| Code                                              | Nghĩa                                                      |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `VALIDATION_FAILED`                               | Body/query không đúng Zod schema                           |
| `UNAUTHORIZED`, `INVALID_TOKEN`                   | Thiếu/sai token                                            |
| `NO_TENANT`, `TENANT_MISMATCH`                    | Host không resolve được tenant hoặc token dùng sai host    |
| `FORBIDDEN`                                       | Role không đủ quyền                                        |
| `SUBSCRIPTION_SUSPENDED`, `SUBSCRIPTION_INACTIVE` | Subscription chặn route thường                             |
| `FEATURE_NOT_AVAILABLE`                           | Gói không bật feature yêu cầu                              |
| `QUOTA_EXCEEDED`, `STORAGE_EXCEEDED`              | Vượt quota gói                                             |
| `SLUG_UNAVAILABLE`, `MEMBER_EXISTS`               | Trùng slug/thành viên                                      |
| `NOT_FOUND`, `NO_*`                               | Không tìm thấy tài nguyên trong scope tenant/school/parent |
| `INVALID_SIGNATURE`                               | Webhook signature không hợp lệ                             |

## Demo Data

Sau khi chạy `pnpm prisma:seed && pnpm prisma:seed:demo`, tenant demo có host `demo.<ROOT_DOMAIN>`.

Tài khoản demo, mật khẩu `Password123`:

| Role | Login                                          |
| ---- | ---------------------------------------------- |
| AD   | `admin@hoasen.edu.vn`                          |
| HT   | `hieutruong@hoasen.edu.vn`                     |
| GV   | `co.mai@hoasen.edu.vn`, `co.lan@hoasen.edu.vn` |
| YT   | `yta.hoa@hoasen.edu.vn`                        |
| KT   | `ketoan@hoasen.edu.vn`                         |
| PH   | `ph01@gmail.com` ... `ph12@gmail.com`          |
