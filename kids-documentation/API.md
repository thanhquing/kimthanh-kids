# API Contract — KimThanh Kids (`kids-api`)

Base path: `/api`. Swagger UI: `GET /docs` khi `NODE_ENV != production`.
Host quyết định tenant: tenant dùng `<slug>.<ROOT_DOMAIN>`, platform dùng `admin.<ROOT_DOMAIN>`.

Header auth chuẩn:

```http
Authorization: Bearer <accessToken>
Host: demo.kimthanhkids.vn
```

## Quy ước chung

Response JSON được `TransformInterceptor` bọc:

```json
{ "success": true, "data": {} }
```

Response phân trang:

```json
{ "success": true, "data": [], "meta": { "page": 1, "pageSize": 20, "total": 42 } }
```

Error:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_FAILED", "message": "...", "details": {} }
}
```

Ngoại lệ trả raw response: `GET /media/:id/file` trả stream file, `GET /tuition/invoices/:id/print` trả HTML, `GET /tuition/invoices/export` trả CSV.

Ký hiệu role: `AD` = SCHOOL_ADMIN, `HT` = PRINCIPAL, `GV` = TEACHER, `YT` = NURSE, `KT` = FINANCE, `PH` = PARENT, `STAFF` = AD/HT/GV/YT/KT.

## Enum dùng trong API

| Enum | Values |
|---|---|
| `TenantRole` | `SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `NURSE`, `FINANCE`, `PARENT` |
| `TenantStatus` | `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED` |
| `SubscriptionStatus` | `TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`, `EXPIRED` |
| `PlanTier` | `FREE`, `STARTER`, `PRO`, `ENTERPRISE`, `CUSTOM` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `StudentStatus` | `ACTIVE`, `INACTIVE`, `GRADUATED`, `WITHDRAWN` |
| `AttendanceStatus` | `PRESENT`, `LATE`, `ABSENT`, `EXCUSED` |
| `Mood` | `HAPPY`, `NEUTRAL`, `TIRED`, `FUSSY` |
| `MediaKind` | `REPORT_PHOTO`, `ALBUM`, `AVATAR`, `DOCUMENT`, `OTHER` |
| `MedicineStatus` | `PENDING`, `APPROVED`, `ADMINISTERED`, `REJECTED` |
| `IncidentSeverity` | `LOW`, `MEDIUM`, `HIGH` |
| `LeaveType` | `SICK`, `FAMILY`, `OTHER` |
| `LeaveStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `Shift` | `MORNING`, `AFTERNOON`, `FULL_DAY` |
| `TuitionInvoiceStatus` | `UNPAID`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELED` |
| `TuitionPaymentMethod` | `CASH`, `BANK_TRANSFER`, `VNPAY` |
| `AnnouncementAudience` | `ALL`, `PARENTS`, `TEACHERS`, `CLASS` |
| `MealType` | `BREAKFAST`, `LUNCH`, `SNACK`, `DINNER` |
| `NotificationType` | `ATTENDANCE`, `DAILY_REPORT`, `ANNOUNCEMENT`, `INVOICE`, `MEDICINE`, `LEAVE`, `INCIDENT` |
| `BillingCycle` | `MONTHLY`, `QUARTERLY`, `ANNUAL` |
| `BillingCurrency` | `VND`, `USD` |
| `LimitMetric` | `STUDENTS`, `TEACHERS`, `CLASSROOMS`, `SCHOOLS`, `STORAGE_MB`, `PUSH_PER_MONTH`, `ADMIN_USERS` |
| `LimitEnforcement` | `HARD`, `SOFT` |
| `PlatformPaymentProvider` | `VNPAY`, `MOMO`, `BANK_TRANSFER`, `MANUAL` |
| `CouponDuration` | `ONCE`, `REPEATING`, `FOREVER` |
| `DiscountKind` | `PERCENT`, `FIXED_AMOUNT` |

`Date` trong request body dùng chuỗi `YYYY-MM-DD`; `DateTime` dùng ISO string.

---

## Public

| Method | Path | Body / Query | Data trả về |
|---|---|---|---|
| `POST` | `/public/signup` | Body `SignupInput` (gồm `taxCode` **bắt buộc** — MST 10/13 số, đúng checksum) | `{ tenant, school, admin, subscription, host }`. Lỗi: `INVALID_TAX_CODE`/`VALIDATION_FAILED` (400), `TAX_CODE_TAKEN` (409 — 1 MST = 1 trường), `SLUG_UNAVAILABLE` (400) |
| `GET` | `/public/availability?slug=` | Query `slug: string` | `{ available: boolean }` |
| `GET` | `/public/branding?host=` | Query `host: string` | branding/settings theo host |

`SignupInput`:

```ts
{
  schoolName: string;      // 2..120
  slug: string;            // 3..32
  adminEmail: string;      // email
  adminPassword: string;   // min 8
  adminFullName: string;   // 2..120
  phone?: string;          // max 20
}
```

Ghi chú: signup tạo tenant gói `free` ở trạng thái `ACTIVE`, không trial.

## Auth

| Method | Path | Body | Data trả về |
|---|---|---|---|
| `POST` | `/auth/login` | `LoginInput` | `{ user, accessToken, refreshToken }` |
| `POST` | `/auth/refresh` | `{ refreshToken: string }` | `{ accessToken, refreshToken }` mới |
| `POST` | `/auth/logout` | `{ refreshToken: string }` | `{ ok: true }` |
| `GET` | `/auth/me` | Bearer | user hiện tại + memberships/roles |

`LoginInput`:

```ts
{
  identifier?: string; // email hoặc phone
  email?: string;      // giữ tương thích cũ
  password: string;
}
```

Cần có `identifier` hoặc `email`. Với tenant user, host phải khớp tenant của token; sai host trả `TENANT_MISMATCH`.

---

## Tenant Self-Service

Role: `AD`, `HT`. Host: tenant.

| Method | Path | Body / Query | Data trả về |
|---|---|---|---|
| `GET` | `/tenant/settings` | - | `TenantSettings` |
| `PATCH` | `/tenant/settings` | `TenantSettingsPatch` | `TenantSettings` sau cập nhật |
| `GET` | `/tenant/schools` | - | `School[]` |
| `POST` | `/tenant/schools` | `SchoolInput` | `School` |
| `GET` | `/tenant/members` | - | users + memberships |
| `POST` | `/tenant/members` | `CreateMemberInput` | user mới + membership |
| `PATCH` | `/tenant/members/:userId/status` | `{ isActive: boolean }` | user sau cập nhật |
| `GET` | `/tenant/domains` | - | `TenantDomain[]` |
| `POST` | `/tenant/domains` | `{ host: string }` | domain PENDING + `verifyToken` |
| `POST` | `/tenant/domains/:id/verify` | - | domain ACTIVE nếu verify OK |

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

| Method | Path | Body / Query | Data trả về |
|---|---|---|---|
| `GET` | `/billing/plans` | Inactive-OK | public plans + prices/features/limits |
| `GET` | `/billing/subscription` | Inactive-OK | subscription + plan + entitlements |
| `GET` | `/billing/usage` | Inactive-OK | usage counters/quota hiện tại |
| `GET` | `/billing/invoices` | Inactive-OK | `PlatformInvoice[]` + lines |
| `POST` | `/billing/subscription/change` | `{ planId: uuid, billingCycle: BillingCycle }` | subscription sau đổi gói |
| `POST` | `/billing/subscription/cancel` | `{ atPeriodEnd?: boolean }` | subscription sau cancel |
| `POST` | `/billing/invoices/:id/pay` | `{ provider: PlatformPaymentProvider }` | `PlatformPayment` + `redirectUrl` nếu gateway |

---

## Platform Admin

Host: `admin.<ROOT_DOMAIN>`. Role platform: `PLATFORM_SUPER_ADMIN`, `PLATFORM_BILLING`.

| Method | Path | Body / Query | Data trả về |
|---|---|---|---|
| `GET` | `/platform/overview` | - | dashboard console: `{ kpis{tenants,activeTenants,trialTenants,overdueInvoices,suspendedTenants,mrr}, mrrSeries[12], mrrGrowthPct, planDistribution[], recentTenants[], recentOverdue[] }` |
| `GET` | `/platform/revenue?months=` | `months?: 1..24` (mặc định 12, kẹp ≤24) | `{ months, series:[{period,month,value,source}], growthPct }` — chuỗi MRR theo tháng (`source`: `CRON` số thực \| `BACKFILL` \| `DERIVED` suy ngược) |
| `POST` | `/platform/mrr/backfill?months=` | `months?: number` (mặc định 24); **chỉ `PLATFORM_SUPER_ADMIN`** | `{ ok, written }` — backfill snapshot các tháng còn thiếu (không đè số thực) |
| `GET` | `/platform/tenants?page=&status=&q=` | `page?: number`, `status?: TenantStatus`, `q?: string` (tìm theo slug/legalName/displayName, server-side) | paginated tenant list — mỗi dòng kèm `planTier`, `billingCycle`, `studentCount` (HS active), `mrr` (VND/tháng); `meta{page,pageSize,total}` |
| `GET` | `/platform/tenants/stats` | - | đếm tenant theo trạng thái: `{ total, ACTIVE, TRIAL, PAST_DUE, SUSPENDED }` (cho chip lọc) |
| `POST` | `/platform/tenants` | `PlatformCreateTenantInput` | `{ tenant, school, admin, subscription }` |
| `GET` | `/platform/tenants/:id` | - | tenant detail + settings/domains/subscription/invoices; **bổ sung**: `mrr`, `studentCount`, `quota[{metric,used,limit,enforcement}]` (STUDENTS/TEACHERS/CLASSROOMS/STORAGE_MB), `schools[]` kèm `_count{students,classrooms}` |
| `POST` | `/platform/tenants/:id/suspend` | - | `{ ok: true }` |
| `POST` | `/platform/tenants/:id/reactivate` | - | `{ ok: true }` |
| `POST` | `/platform/tenants/:id/entitlements` | `EntitlementOverrideInput` | `TenantEntitlement` |
| `POST` | `/platform/tenants/:id/impersonate` | - | tenant admin access token, no refresh token |
| `GET` | `/platform/subscriptions?page=&status=` | `page?: number`, `status?: SubscriptionStatus` | paginated subscriptions — mỗi dòng kèm `tenantName`, `tenantSlug`, `billingCycle`, `autoRenew` (=`!cancelAtPeriodEnd`), `mrr` (VND/tháng); `meta{page,pageSize,total}` |
| `GET` | `/platform/subscriptions/stats` | - | đếm thuê bao theo trạng thái: `{ total, TRIALING, ACTIVE, PAST_DUE, SUSPENDED, CANCELED, EXPIRED }` |
| `GET` | `/platform/invoices?page=&tenantId=&status=` | filters | paginated platform invoices |
| `POST` | `/platform/invoices` | `{ tenantId: string }` | created platform invoice |
| `POST` | `/platform/invoices/:id/mark-paid` | `{ amount?: number }` | invoice after payment |
| `GET` | `/platform/plans` | - | all plans |
| `POST` | `/platform/plans` | `CreatePlanInput` | created plan + nested config |
| `GET` | `/platform/coupons?page=&isActive=` | filters | paginated coupons |
| `POST` | `/platform/coupons` | `CreateCouponInput` | created coupon |
| `GET` | `/platform/usage/overview` | - | `{ tenants, activeTenants, users, dau, wau, mau, topEvents }` |

`PlatformCreateTenantInput` dùng cùng schema với `SignupInput` nhưng chỉ dành cho platform console:

```ts
{
  schoolName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
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

| Method | Path | Body / Header | Data trả về |
|---|---|---|---|
| `POST` | `/platform/webhooks/:provider` | provider `vnpay`/`momo`/`bank_transfer`/`manual`; header `x-signature` hoặc `payload.signature` | `{ ok: true }`, `{ ok: true, deduped: true }`, hoặc error `INVALID_SIGNATURE` |

---

## B — Hồ sơ & Tổ Chức

### Classrooms

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `GET` | `/classrooms?schoolId=` | STAFF | `schoolId?: uuid` | `Classroom[]` scoped |
| `GET` | `/classrooms/:id` | STAFF | - | `Classroom` |
| `POST` | `/classrooms` | AD,HT | `ClassroomCreate` | `Classroom` |
| `PATCH` | `/classrooms/:id` | AD,HT | `ClassroomPatch` | `Classroom` |
| `DELETE` | `/classrooms/:id` | AD,HT | - | `{ ok: true }` |

```ts
type ClassroomCreate = {
  schoolId: string;
  name: string;              // 1..120
  ageGroup?: string;         // max 40
  capacity?: number;         // 1..200
  homeroomTeacherId?: string;
};
type ClassroomPatch = Partial<Omit<ClassroomCreate, "schoolId">> & {
  homeroomTeacherId?: string | null;
  isActive?: boolean;
};
```

Create check quota `CLASSROOMS`. Delete là soft-delete.

### Students

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `GET` | `/students/mine` | PH | - | children của PH |
| `GET` | `/students?classroomId=&schoolId=` | STAFF | filters optional | `Student[]` |
| `GET` | `/students/:id` | STAFF | - | `Student` + parents/classroom |
| `POST` | `/students` | AD,HT,GV | `StudentCreate` | `Student` |
| `PATCH` | `/students/:id` | AD,HT,GV | `StudentPatch` | `Student` |
| `DELETE` | `/students/:id` | AD,HT,GV | - | `{ ok: true }` |
| `POST` | `/students/:id/guardians` | AD,HT,GV | `GuardianInput` | `StudentParent` |
| `DELETE` | `/students/:id/guardians/:parentId` | AD,HT,GV | - | `{ ok: true }` |

```ts
type GuardianInput = {
  parentId: string;
  relationship: string; // 1..40
  isPrimary?: boolean;
};
type StudentCreate = {
  schoolId: string;
  classroomId?: string;
  fullName: string;       // 1..120
  nickname?: string;      // max 60
  dateOfBirth: string;    // YYYY-MM-DD
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

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/attendance/mark` | AD,HT,GV | `AttendanceMarkInput` | `Attendance[]` upsert theo học sinh/ngày |
| `GET` | `/attendance?classroomId=&date=` | STAFF | required query | `Attendance[]` |
| `GET` | `/attendance/student/:studentId` | STAFF,PH | - | history của học sinh |

```ts
type AttendanceMarkInput = {
  classroomId: string;
  date: string; // YYYY-MM-DD
  entries: Array<{
    studentId: string;
    status: AttendanceStatus;
    checkInAt?: string; // DateTime
    note?: string;      // max 300
  }>;
};
```

### Daily Reports

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/daily-reports` | AD,HT,GV | `DailyReportUpsertInput` | `DailyReport` |
| `GET` | `/daily-reports?classroomId=&date=` | STAFF | required query | `DailyReport[]` |
| `GET` | `/daily-reports/student/:studentId` | STAFF,PH | - | report feed của học sinh |

```ts
type DailyReportUpsertInput = {
  studentId: string;
  date: string; // YYYY-MM-DD
  mood?: Mood;
  meals?: string;      // max 500
  nap?: string;        // max 500
  activities?: string; // max 500
  note?: string;       // max 1000
};
```

Upsert unique theo `(studentId, date)`. Notification chỉ phát khi tạo mới.

### Media

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/media?kind=&schoolId=` | AD,HT,GV,YT | multipart field `file`; max 15MB | `{ id, url, mimeType, sizeBytes, width, height }` |
| `GET` | `/media/:id/file` | STAFF,KT,PH | - | raw stream `image/webp`/mimeType tương ứng |

Ảnh upload được nén về WebP, cạnh dài tối đa `MEDIA_MAX_DIM` (default 1280), check quota `STORAGE_MB`.

---

## D — Sức Khỏe

### Health Records

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/health` | AD,HT,YT,GV | `HealthRecordInput` | `HealthRecord` |
| `GET` | `/health/student/:studentId` | STAFF,PH | - | `HealthRecord[]` |
| `GET` | `/health/student/:studentId/growth` | STAFF,PH | - | `{ height: Point[], weight: Point[] }` |

```ts
type HealthRecordInput = {
  studentId: string;
  date: string; // YYYY-MM-DD
  heightCm?: number;     // >0, <=250
  weightKg?: number;     // >0, <=150
  temperatureC?: number; // 30..45
  note?: string;         // max 500
};
```

Cần ít nhất một chỉ số trong `heightCm`, `weightKg`, `temperatureC`.

### Medicine

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/medicine` | STAFF,PH | `MedicineCreate` | `MedicineRequest` PENDING |
| `GET` | `/medicine/mine` | PH | - | requests của con mình |
| `GET` | `/medicine?status=` | STAFF | `status?: MedicineStatus` | `MedicineRequest[]` |
| `GET` | `/medicine/:id` | STAFF,PH | - | request + status history |
| `POST` | `/medicine/:id/handle` | AD,HT,YT,GV | `MedicineHandle` | updated request |

```ts
type MedicineCreate = {
  studentId: string;
  medicineName: string; // 1..200
  dosage: string;       // 1..200
  schedule: string;     // 1..200
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  reason?: string;      // max 500
};
type MedicineHandle = {
  status: MedicineStatus; // APPROVED, ADMINISTERED, REJECTED...
  note?: string;          // max 500
};
```

### Incidents & Allergies & Leave

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/incidents` | AD,HT,GV,YT | `IncidentCreate` | `Incident` |
| `GET` | `/incidents?studentId=` | STAFF | filter optional | `Incident[]` |
| `GET` | `/incidents/student/:studentId` | STAFF,PH | - | `Incident[]` |
| `POST` | `/allergies` | AD,HT,YT,GV | `AllergyCreate` | `Allergy` |
| `GET` | `/allergies/student/:studentId` | STAFF,PH | - | `Allergy[]` |
| `DELETE` | `/allergies/:id` | AD,HT,YT,GV | - | `{ ok: true }` |
| `POST` | `/leave` | STAFF,PH | `LeaveCreate` | `LeaveRequest` PENDING |
| `GET` | `/leave/mine` | PH | - | requests của con mình |
| `GET` | `/leave?status=` | STAFF | `status?: LeaveStatus` | `LeaveRequest[]` |
| `GET` | `/leave/:id` | STAFF,PH | - | `LeaveRequest` |
| `POST` | `/leave/:id/decide` | AD,HT,GV | `LeaveDecision` | updated request |

```ts
type IncidentCreate = {
  studentId: string;
  date: string;
  type: string;             // 1..100
  severity?: IncidentSeverity;
  description: string;      // 1..2000
  actionTaken?: string;     // max 2000
};
type AllergyCreate = {
  studentId: string;
  allergen: string; // 1..200
  note?: string;    // max 500
};
type LeaveCreate = {
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;        // max 1000
  attachmentUrl?: string; // url, max 500
};
type LeaveDecision = {
  status: LeaveStatus; // APPROVED hoặc REJECTED trong nghiệp vụ
  note?: string;       // max 500
};
```

Lỗi thường gặp: `NO_STUDENT`, `NO_REQUEST`, `ALREADY_DECIDED`, `DUPLICATE_ALLERGY`.

---

## B3 — Phân Công Nhân Sự

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `GET` | `/assignments/mine` | STAFF | - | lịch của user hiện tại |
| `GET` | `/assignments?staffId=&classroomId=&weekday=` | AD,HT | filters optional | `StaffAssignment[]` |
| `POST` | `/assignments` | AD,HT | `AssignmentCreate` | `StaffAssignment` |
| `PATCH` | `/assignments/:id` | AD,HT | `AssignmentPatch` | `StaffAssignment` |
| `DELETE` | `/assignments/:id` | AD,HT | - | `{ ok: true }` |

```ts
type AssignmentCreate = {
  staffId: string;
  classroomId?: string;
  schoolId?: string;
  weekday: number; // 1..7, 1 = Thứ 2
  shift: Shift;
  duty: string;    // 1..100
  note?: string;   // max 300
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

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/tuition/invoices` | AD,HT,KT | `TuitionInvoiceCreate` | invoice + items |
| `GET` | `/tuition/invoices/mine` | PH | - | invoices của con mình |
| `GET` | `/tuition/invoices?status=&studentId=` | STAFF | filters optional | `TuitionInvoice[]` |
| `GET` | `/tuition/invoices/export?status=` | STAFF | `status?: TuitionInvoiceStatus` | raw CSV |
| `GET` | `/tuition/invoices/:id` | AD,HT,KT,PH | - | invoice + student/items/payments |
| `GET` | `/tuition/invoices/:id/print` | AD,HT,KT,PH | - | raw HTML chứng từ |
| `POST` | `/tuition/invoices/:id/cancel` | AD,HT,KT | - | invoice status `CANCELED` |
| `POST` | `/tuition/invoices/:id/pay/manual` | AD,HT,KT | `ManualPaymentInput` | `TuitionPayment` |
| `GET` | `/tuition/invoices/:id/vietqr` | AD,HT,KT,PH | - | `VietQrResponse` |
| `POST` | `/tuition/invoices/:id/pay/gateway` | AD,HT,KT,PH | `{ method: "VNPAY" }` | `{ paymentId, gatewayRef, redirectUrl }` |
| `POST` | `/tuition/webhooks/:method` | public | payload gateway + `x-signature?` | `{ ok: true }`, `ignored`, hoặc `deduped` |

```ts
type TuitionInvoiceCreate = {
  studentId: string;
  period: string;    // 1..40, vd "2026-06"
  issueDate?: string;
  dueDate: string;
  discount?: number; // >=0
  note?: string;     // max 500
  items: Array<{
    label: string;       // 1..120
    quantity?: number;   // 1..999, default service-side
    unitPrice: number;   // >=0
  }>;
};
type ManualPaymentInput = {
  method: "CASH" | "BANK_TRANSFER";
  amount?: number;    // default = remaining
  reference?: string; // max 120
};
type VietQrResponse = {
  payload: string;       // EMVCo string
  bankBin: string;
  accountNumber: string;
  accountName?: string;
  amount: number;
  addInfo: string;       // invoiceNumber sanitized
};
```

Lỗi thường gặp: `NO_INVOICE`, `NO_STUDENT`, `BAD_AMOUNT`, `ALREADY_PAID`, `CANCELED`, `HAS_PAYMENT`, `NOTHING_DUE`, `NO_BANK_CONFIG`, `INVALID_SIGNATURE`.

---

## F — Giao Tiếp & Nội Dung

### Announcements

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/announcements` | AD,HT,GV | `AnnouncementCreate` | `Announcement` |
| `GET` | `/announcements/feed` | STAFF,PH | - | feed theo audience/quyền xem |
| `GET` | `/announcements?audience=` | STAFF | `audience?: AnnouncementAudience` | `Announcement[]` |
| `GET` | `/announcements/:id` | STAFF,PH | - | `Announcement` |
| `POST` | `/announcements/:id/publish` | AD,HT,GV | - | `Announcement` published |
| `DELETE` | `/announcements/:id` | AD,HT,GV | - | `{ ok: true }` |

```ts
type AnnouncementCreate = {
  audience: AnnouncementAudience;
  schoolId?: string;
  classroomId?: string; // bắt buộc khi audience=CLASS
  title: string;        // 1..200
  body: string;         // 1..5000
  publish?: boolean;
};
```

### Menus, Lesson Plans, Albums

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `POST` | `/menus` | AD,HT,YT | `MenuCreate` | menu + meals |
| `GET` | `/menus?weekStart=&classroomId=` | STAFF,PH | filters optional | `WeeklyMenu[]` |
| `GET` | `/menus/:id` | STAFF,PH | - | menu + meals |
| `GET` | `/menus/:id/allergy-warnings?studentId=` | STAFF,PH | required studentId | allergy warning list |
| `DELETE` | `/menus/:id` | AD,HT,YT | - | `{ ok: true }` |
| `POST` | `/lesson-plans` | AD,HT,GV + feature `lesson_plan` | `LessonPlanCreate` | plan + activities |
| `GET` | `/lesson-plans?classroomId=&week=` | AD,HT,GV + feature | filters optional | `LessonPlan[]` |
| `GET` | `/lesson-plans/:id` | AD,HT,GV + feature | - | plan + activities |
| `DELETE` | `/lesson-plans/:id` | AD,HT,GV + feature | - | `{ ok: true }` |
| `POST` | `/albums` | AD,HT,GV + feature `media_gallery` | `AlbumCreate` | `Album` |
| `POST` | `/albums/:id/photos` | AD,HT,GV + feature | `AlbumPhotosInput` | created `AlbumPhoto[]` |
| `GET` | `/albums?classroomId=` | STAFF,PH + feature | filter optional | `Album[]` |
| `GET` | `/albums/:id` | STAFF,PH + feature | - | album + photos/media |
| `DELETE` | `/albums/photos/:photoId` | AD,HT,GV + feature | - | `{ ok: true }` |
| `DELETE` | `/albums/:id` | AD,HT,GV + feature | - | `{ ok: true }` |

```ts
type MenuCreate = {
  weekStart: string; // YYYY-MM-DD
  schoolId?: string;
  classroomId?: string;
  note?: string;     // max 500
  meals: Array<{
    weekday: number; // 1..7
    mealType: MealType;
    name: string;       // 1..300
    ingredients?: string; // max 500
  }>;
};
type LessonPlanCreate = {
  classroomId: string;
  week: string;     // 1..40, vd "2026-W27"
  theme: string;    // 1..200
  note?: string;    // max 1000
  activities?: Array<{
    dayOfWeek: number; // 1..7
    startTime?: string; // max 10
    title: string;      // 1..200
    materials?: string; // max 500
  }>;
};
type AlbumCreate = {
  classroomId?: string;
  schoolId?: string;
  title: string;        // 1..200
  description?: string; // max 1000
};
type AlbumPhotosInput = {
  photos: Array<{ mediaId: string; caption?: string }>;
};
```

Lỗi thường gặp: `FEATURE_NOT_AVAILABLE`, `NO_MENU`, `NO_PLAN`, `NO_ALBUM`, `NO_MEDIA`, `NO_STUDENT`.

---

## G — Notifications, Dashboard, Audit

| Method | Path | Role | Body / Query | Data trả về |
|---|---|---|---|---|
| `GET` | `/notifications?unreadOnly=true|false` | mọi tenant role | optional | `Notification[]` của user hiện tại |
| `GET` | `/notifications/unread-count` | mọi tenant role | - | `{ count: number }` |
| `GET` | `/notifications/preferences` | mọi tenant role | - | preferences cho đủ `NotificationType` |
| `PATCH` | `/notifications/preferences` | mọi tenant role | `{ type: NotificationType, enabled: boolean }` | `NotificationPreference` |
| `POST` | `/notifications/read-all` | mọi tenant role | - | batch update result |
| `POST` | `/notifications/:id/read` | mọi tenant role | - | `Notification` với `readAt` |
| `GET` | `/dashboard/summary` | AD,HT | - | dashboard summary |
| `GET` | `/audit-logs?action=&limit=` | AD,HT | `action?: string`, `limit?: 1..500` | `AuditLog[]` newest first |

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
  outstandingAmount: number;
  revenueThisMonth: number;
}
```

Notification phát từ 6 sự kiện hiện có: tạo daily report, publish announcement, tạo incident, tạo tuition invoice, xử lý medicine, quyết định leave. Push FCM chưa có; `NotificationsService.notify` là điểm gắn sau.

---

## Mã Lỗi Chung

| Code | Nghĩa |
|---|---|
| `VALIDATION_FAILED` | Body/query không đúng Zod schema |
| `UNAUTHORIZED`, `INVALID_TOKEN` | Thiếu/sai token |
| `NO_TENANT`, `TENANT_MISMATCH` | Host không resolve được tenant hoặc token dùng sai host |
| `FORBIDDEN` | Role không đủ quyền |
| `SUBSCRIPTION_SUSPENDED`, `SUBSCRIPTION_INACTIVE` | Subscription chặn route thường |
| `FEATURE_NOT_AVAILABLE` | Gói không bật feature yêu cầu |
| `QUOTA_EXCEEDED`, `STORAGE_EXCEEDED` | Vượt quota gói |
| `SLUG_UNAVAILABLE`, `MEMBER_EXISTS` | Trùng slug/thành viên |
| `NOT_FOUND`, `NO_*` | Không tìm thấy tài nguyên trong scope tenant/school/parent |
| `INVALID_SIGNATURE` | Webhook signature không hợp lệ |

## Demo Data

Sau khi chạy `pnpm prisma:seed && pnpm prisma:seed:demo`, tenant demo có host `demo.<ROOT_DOMAIN>`.

Tài khoản demo, mật khẩu `Password123`:

| Role | Login |
|---|---|
| AD | `admin@hoasen.edu.vn` |
| HT | `hieutruong@hoasen.edu.vn` |
| GV | `co.mai@hoasen.edu.vn`, `co.lan@hoasen.edu.vn` |
| YT | `yta.hoa@hoasen.edu.vn` |
| KT | `ketoan@hoasen.edu.vn` |
| PH | `ph01@gmail.com` ... `ph12@gmail.com` |
