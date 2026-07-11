# Sơ đồ Cơ sở dữ liệu — Tầng A (Platform / SaaS)

Nguồn chân lý: [`kids-api/prisma/schema.prisma`](../kids-api/prisma/schema.prisma).
Quy ước: UUID PK · tiền tệ `Decimal(12,2)` default `VND` · soft-delete (`deletedAt`) · audit (`createdAt/updatedAt`).

> **Nguyên tắc vàng:** `tenantId` = ranh giới **BẢO MẬT** (luôn auto-filter). `schoolId` = ranh giới **NGHIỆP VỤ** (scope theo quyền). Mọi bảng domain (Phase 1) BẮT BUỘC có cả hai.

## Sơ đồ quan hệ (Mermaid ERD)

```mermaid
erDiagram
  Tenant ||--o| TenantSettings : "1-1 white-label"
  Tenant ||--o{ TenantDomain : "subdomain/custom"
  Tenant ||--o{ School : "chi nhánh (1..N)"
  Tenant ||--o{ Membership : ""
  Tenant ||--o| Subscription : "1-1 thuê bao"
  Tenant ||--o{ TenantEntitlement : "override"
  Tenant ||--o{ UsageCounter : "quota cache"

  User ||--o{ Membership : "role binding"
  School ||--o{ Membership : "scope (nullable)"
  User ||--o{ RefreshToken : ""

  Plan ||--o{ PlanPrice : "giá theo chu kỳ"
  Plan ||--o{ PlanFeature : "feature flag"
  Plan ||--o{ PlanLimit : "quota"
  Plan ||--o{ Subscription : ""

  Subscription ||--o{ SubscriptionChange : "audit/proration"
  Subscription ||--o{ PlatformInvoice : ""
  Subscription ||--o{ UsageCounter : ""
  Coupon ||--o{ Subscription : ""

  PlatformInvoice ||--o{ PlatformInvoiceLine : ""
  PlatformInvoice ||--o{ PlatformPayment : ""
  PlatformInvoice ||--o{ CreditLedger : ""

  Tenant {
    uuid id PK
    string slug UK "→ slug.kimthanhkids.vn"
    string code UK "mã trường human-friendly — search/chọn tenant ở login (độc lập subdomain)"
    string legalName
    string taxCode UK "MST pháp nhân — 1 MST = 1 trường (chống mở trùng)"
    datetime taxVerifiedAt "đã xác minh MST với cơ quan thuế"
    enum status "TRIAL|ACTIVE|PAST_DUE|SUSPENDED|CANCELLED (cache)"
    enum tenancyMode "POOL|SILO"
    enum planTier
    datetime currentPeriodEnd "cache cho guard"
    datetime trialEndsAt
    datetime deletedAt
  }
  TenantSettings {
    uuid id PK
    uuid tenantId FK,UK
    string displayName "thay 'KimThanh Kids'"
    string logoUrl
    string faviconUrl
    string primaryColor "default #2563eb"
    string secondaryColor
    string emailFromName
    string emailFromAddr
    string supportEmail
    string locale "default vi-VN"
    string timezone "default Asia/Ho_Chi_Minh"
    string taxCode "MST — quyết toán thuế"
    string invoiceAddress
    string bankBin "VietQR napas"
    string bankAccountNumber
    string bankAccountName
  }
  TenantDomain {
    uuid id PK
    uuid tenantId FK
    string host UK
    enum type "SUBDOMAIN|CUSTOM"
    enum status "PENDING|VERIFYING|ACTIVE|FAILED"
    bool isPrimary
    string verifyToken
  }
  School {
    uuid id PK
    uuid tenantId FK
    string name
    string code "UK theo tenant"
    string moetCode "mã trường Bộ GD&ĐT (CSDL ngành)"
    bool isActive
    datetime deletedAt
  }
  User {
    uuid id PK
    enum type "PLATFORM|TENANT"
    string email "nullable — định danh email HOẶC phone; UK (tenantId,email)"
    string phone "nullable; UK (tenantId,phone) — login bằng cả hai"
    string passwordHash "bcrypt cost BCRYPT_COST (12); rehash khi login nếu cost cũ"
    string fullName
    bool isActive "tắt → chặn đăng nhập"
    int tokenVersion "bump khi reset mật khẩu → vô hiệu access token đang lưu hành"
    int failedLoginCount "đếm login sai liên tiếp"
    datetime lockedUntil "nullable — account lockout tới thời điểm này"
    enum platformRole "chỉ khi PLATFORM"
    uuid tenantId FK "null nếu PLATFORM"
    datetime deletedAt
  }
  Membership {
    uuid id PK
    uuid tenantId FK
    uuid userId FK
    enum role "SCHOOL_ADMIN|PRINCIPAL|TEACHER|NURSE|FINANCE|PARENT"
    uuid schoolId FK "null = toàn tenant (chuỗi)"
    bool isActive
    uuid createdById
    datetime deletedAt
  }
  RefreshToken {
    uuid id PK
    uuid userId FK
    string tokenHash UK "SHA-256"
    uuid familyId "nullable — nhóm token theo phiên; reuse token đã revoke → revoke cả họ"
    datetime expiresAt
    datetime revokedAt
  }
  Plan {
    uuid id PK
    string code UK "free|starter|pro|enterprise|dedicated"
    enum tier "FREE|STARTER|PRO|ENTERPRISE|CUSTOM"
    bool isPublic "dedicated = false (ẩn)"
    bool isActive
    bool isFeatured "gói đại diện mỗi tier — landing chỉ hiện featured (BL-050); partial unique UNIQUE(tier) WHERE isFeatured ⇒ ≤1/tier"
    int trialDays "seed = 0 (freemium, không trial)"
  }
  PlanPrice {
    uuid id PK
    uuid planId FK
    enum billingCycle "MONTHLY|QUARTERLY|ANNUAL"
    enum currency
    decimal amount
  }
  PlanFeature {
    uuid id PK
    uuid planId FK
    string featureKey "messaging|media_gallery|lesson_plan|analytics|api_access"
    bool enabled
  }
  PlanLimit {
    uuid id PK
    uuid planId FK
    enum metric "STUDENTS|TEACHERS|STORAGE_MB (CLASSROOMS còn trong enum nhưng KHÔNG seed — BL-049)"
    int limitValue "null = unlimited"
    enum enforcement "HARD|SOFT"
  }
  Subscription {
    uuid id PK
    uuid tenantId FK,UK
    uuid planId FK
    enum billingCycle
    enum status "TRIALING|ACTIVE|PAST_DUE|SUSPENDED|CANCELED|EXPIRED (nguồn chân lý)"
    enum billingMode "GATEWAY|MANUAL|DEDICATED_FREE"
    datetime currentPeriodStart
    datetime currentPeriodEnd
    datetime trialEndsAt
    bool cancelAtPeriodEnd
    datetime pastDueSince
    json entitlementsCache
  }
  SubscriptionChange {
    uuid id PK
    uuid subscriptionId FK
    enum type "UPGRADE|DOWNGRADE|RENEW|CANCEL|..."
    decimal prorationAmount
    datetime effectiveAt
  }
  PlatformInvoice {
    string publicToken "UK — uuid; link công khai /hoa-don/:token"
    uuid id PK
    string invoiceNumber UK "{SLUG}-{MÃ_GÓI}-{YYYYMMDD}-{NN}"
    uuid tenantId
    uuid subscriptionId FK
    enum status "DRAFT|OPEN|PAID|OVERDUE|VOID|UNCOLLECTIBLE"
    decimal total
    decimal amountPaid
    datetime dueAt
    datetime paidAt
  }
  PlatformInvoiceLine {
    uuid id PK
    uuid invoiceId FK
    enum kind "SUBSCRIPTION|PRORATION_*|OVERAGE|DISCOUNT|TAX"
    decimal amount "có thể âm"
  }
  PlatformPayment {
    uuid id PK
    uuid invoiceId FK
    enum provider "VNPAY|MOMO|BANK_TRANSFER|MANUAL"
    enum status "CREATED|PENDING|SUCCEEDED|FAILED|REFUNDED|..."
    decimal amount
    string gatewayRef "UK theo (provider,gatewayRef) — idempotent"
  }
  PlatformWebhookEvent {
    uuid id PK
    enum provider
    string eventId "UK theo (provider,eventId) — dedupe"
    bool verified
    bool processed
  }
  MrrSnapshot {
    uuid id PK
    datetime periodMonth "UK — 00:00 ngày 1 tháng (UTC)"
    decimal mrr "MRR VND/tháng"
    int activeSubs
    json byTier "MRR theo tier"
    enum source "CRON số thực | BACKFILL suy ngược"
  }
  PlatformConfig {
    string id PK "='singleton' (1 hàng)"
    string bankBin "NAPAS BIN — VietQR"
    string bankAccountNumber
    string bankAccountName
    int pastDueGraceDays "quá hạn→tạm khóa (mặc định ENV 7)"
    int suspendedGraceDays "tạm khóa→hủy (mặc định ENV 14)"
  }
  TenantEntitlement {
    uuid id PK
    uuid tenantId
    string featureKey "override feature"
    enum metric "override limit"
    int limitValue
    datetime expiresAt
  }
  UsageCounter {
    uuid id PK
    uuid tenantId
    enum metric
    int value "counter cache cho quota"
  }
  Coupon {
    uuid id PK
    string code UK
    enum kind "PERCENT|FIXED_AMOUNT"
    decimal amount
    enum duration "ONCE|REPEATING|FOREVER"
  }
  CreditLedger {
    uuid id PK
    uuid tenantId
    uuid invoiceId FK
    decimal amount "+ cấp / - tiêu"
  }
  AuditLog {
    uuid id PK
    uuid tenantId
    uuid actorId
    string action "tenant.suspend|invoice.void|..."
  }
```

## Nhóm bảng

1. **Identity & Tenancy:** `Tenant`, `TenantSettings` (white-label), `TenantDomain` (resolution), `School`, `User`, `Membership`, `RefreshToken`.
2. **Plan / Pricing:** `Plan`, `PlanPrice`, `PlanFeature`, `PlanLimit`.
3. **Subscription:** `Subscription` (1/tenant), `SubscriptionChange` (audit + proration).
4. **Billing nền tảng:** `PlatformInvoice`, `PlatformInvoiceLine`, `PlatformPayment`, `PlatformWebhookEvent`.
   - `MrrSnapshot`: platform-global (KHÔNG tenant-scoped), `@@unique(periodMonth)`. Chốt MRR theo tháng cho biểu đồ doanh thu nhiều tháng — cron đầu tháng ghi số thực (`source=CRON`); `backfill` suy ngược lịch sử (`source=BACKFILL`, gần đúng vì mù churn).
5. **Entitlement / Quota / Khuyến mãi:** `TenantEntitlement`, `UsageCounter`, `Coupon`, `CreditLedger`.
6. **Cross-cutting:** `AuditLog`.

## Index & ràng buộc đáng chú ý

- `Tenant.slug` unique; `TenantDomain.host` unique (1 host ↔ 1 tenant).
- `User`: `@@unique([tenantId, email])` + **partial unique** `email WHERE tenantId IS NULL` (platform user) — vì Postgres coi NULL là phân biệt.
- `School`: `@@unique([tenantId, code])`.
- `Subscription`: `@@unique([tenantId])` (1 thuê bao / tenant ở v1).
- `PlatformPayment`: `@@unique([provider, gatewayRef])` (idempotent webhook).
- `PlatformWebhookEvent`: `@@unique([provider, eventId])` (dedupe).
- `UsageCounter`: `@@unique([tenantId, metric])`.

## Deletion contract (xóa dữ liệu)

Nguyên tắc: **soft-delete là cơ chế chính**; hard-delete chỉ dùng cho erasure/ops có kiểm soát và được FK bảo vệ.

- **Soft-delete (`deletedAt`)** — model: `Tenant`, `School`, `Membership`, `Plan`, `Subscription`, `PlatformInvoice`, `Classroom`, `Student` (tập `SOFT_DELETE` trong `prisma-tenant.extension.ts`). Xóa thường = `update({ deletedAt })`; extension **tự ẩn** bản ghi `deletedAt != null` ở chiều đọc. Không physical delete trong luồng nghiệp vụ.
- **Cascade trong aggregate** — bản ghi con chỉ tồn tại cùng cha thì `onDelete: Cascade`: `Student → Attendance/DailyReport/HealthRecord/MedicineRequest/Allergy/Incident/PickupLog/TuitionInvoice/StaffAssignment`; `TuitionInvoice → Item/Payment`; `DailyReport → Photo`; `WeeklyMenu → Meal`; `LessonPlan → Activity`; `Album → Photo`; `MedicineRequest → StatusHistory`; `Subscription/Plan/PlatformInvoice → *`. → **Erasure 1 học sinh** (right-to-erasure) xóa sạch dây con.
- **RESTRICT ở cạnh top** — FK `tenantId`/`schoolId` (required) = `ON DELETE RESTRICT`: **không thể hard-delete Tenant/School khi còn bản ghi con** → chống xóa nhầm dây chuyền cả trường/tenant và chống orphan. Offboarding/xoá-tenant toàn phần là **quy trình ops tường minh, có audit**, không phải một lệnh `DELETE` lạc.
- **SetNull cho ref optional** — vd `Student.classroomId`, `DailyReport.classroomId`: xóa lớp thì bản ghi vẫn sống, chỉ null tham chiếu.
- **Media file** — hiện xóa record `Media` không tự xóa file vật lý (S3/đĩa); cleanup theo retention policy — xem `SECURITY_AUDIT_CHECKLIST.md` §11.

> Regression: `test/deletion-contract.e2e-spec.ts` khóa hành vi (cascade Student→Allergy; RESTRICT chặn xóa School/Tenant còn con).

---

## Tầng B — Domain (Phase 1, đang mở rộng)

> Mỗi bảng domain có `tenantId` (scalar, extension auto-filter) + `schoolId` (nghiệp vụ, scope theo `allowedSchoolIds`).

```mermaid
erDiagram
  School ||--o{ Classroom : ""
  School ||--o{ Student : ""
  Classroom ||--o{ Student : "xếp lớp (nullable)"
  Student ||--o{ StudentParent : ""
  User ||--o{ StudentParent : "parent (role PARENT)"
  User ||--o{ Classroom : "homeroomTeacher"

  Classroom {
    uuid id PK
    string tenantId
    uuid schoolId FK
    string name "UK theo (schoolId,name)"
    string ageGroup
    int capacity
    uuid homeroomTeacherId FK
    datetime deletedAt
  }
  Student {
    uuid id PK
    string tenantId
    uuid schoolId FK
    uuid classroomId FK "nullable"
    string fullName
    string nickname
    date dateOfBirth
    enum gender "MALE|FEMALE|OTHER"
    enum status "ACTIVE|INACTIVE|GRADUATED|WITHDRAWN"
    datetime deletedAt
  }
  StudentParent {
    uuid studentId PK,FK
    uuid parentId PK,FK
    string tenantId
    string relationship "Mẹ|Ba|..."
    bool isPrimary
  }
```

**Đã hoàn thành toàn bộ domain Phase 1 (A→G)** — ER chi tiết theo từng nhóm (D/B3/E/F/G) ở các mục bên dưới + [chỉ mục nhanh cuối tài liệu](#bảng-domain-phase-1-ag--chỉ-mục-nhanh) (Attendance, DailyReport, PickupAuthorization/PickupLog, Health/Medicine/Incident/Allergy/Leave, StaffAssignment, Tuition*, Announcement, WeeklyMenu/Meal, LessonPlan, Album, Notification, UsageEvent…). Mỗi bảng đều mang `tenantId` + `schoolId`. *(Chat GV–PH: Coming Soon — chưa có module.)*

### C — Điểm danh & Báo cáo + Media (Phase 1)

```mermaid
erDiagram
  Student ||--o{ Attendance : ""
  Classroom ||--o{ Attendance : ""
  Student ||--o{ DailyReport : ""
  Classroom ||--o{ DailyReport : ""
  DailyReport ||--o{ DailyReportPhoto : ""
  Media ||--o{ DailyReportPhoto : ""
  Student ||--o{ PickupAuthorization : ""
  Student ||--o{ PickupLog : ""
  PickupAuthorization ||--o{ PickupLog : ""

  Attendance {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    uuid classroomId FK
    date date "UK theo (studentId,date)"
    enum status "PRESENT|LATE|ABSENT|EXCUSED"
    datetime checkInAt
    string note
  }
  DailyReport {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    uuid classroomId FK "nullable"
    date date "UK theo (studentId,date)"
    enum mood "HAPPY|NEUTRAL|TIRED|FUSSY"
    string meals
    string nap
    string activities
    string note
  }
  DailyReportPhoto {
    uuid id PK
    string tenantId
    uuid reportId FK
    uuid mediaId FK
    string caption
    int sortOrder
    datetime createdAt
  }
  PickupAuthorization {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    uuid parentUserId FK "nullable"
    string guardianName
    string guardianPhone
    enum status "ACTIVE|REVOKED"
  }
  PickupLog {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    uuid authorizationId FK "nullable"
    enum eventType "CHECK_IN|CHECK_OUT"
    string guardianName
    datetime occurredAt
  }
  Media {
    uuid id PK
    string tenantId
    uuid schoolId "nullable"
    enum kind "REPORT_PHOTO|ALBUM|AVATAR|DOCUMENT|OTHER"
    string path "<tenantId>/<id>.webp"
    string mimeType
    int sizeBytes
    int width
    int height
  }
```

**Media — lưu trữ nội bộ + nén:** ảnh được nén bằng `sharp` (resize cạnh ≤ `MEDIA_MAX_DIM`=1280px, **webp** quality `MEDIA_QUALITY`=72, xoá metadata) trước khi ghi xuống `MEDIA_ROOT/<tenantId>/<id>.webp` — đủ chất lượng cho phụ huynh xem, tiết kiệm dung lượng. Quota `STORAGE_MB` enforce theo tổng `sizeBytes` của tenant. Phục vụ qua `GET /api/media/:id/file` (StreamableFile, cô lập theo tenant + kiểm quyền school/owner/report/album trước khi stream). `DailyReportPhoto` nối ảnh đã upload vào báo cáo ngày theo `sortOrder`; album dùng `AlbumPhoto`. Xem `kids-api/src/media/`.

### D — Sức khỏe (Phase 1)

```mermaid
erDiagram
  Student ||--o{ HealthRecord : ""
  Student ||--o{ MedicineRequest : ""
  MedicineRequest ||--o{ MedicineStatusHistory : ""
  Student ||--o{ Incident : ""
  Student ||--o{ Allergy : ""
  Student ||--o{ LeaveRequest : ""

  HealthRecord {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    date date
    float heightCm "nullable"
    float weightKg "nullable"
    float temperatureC "nullable"
    string note
    uuid recordedById
  }
  MedicineRequest {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    string medicineName
    string dosage
    string schedule "vd 8h,14h"
    date startDate
    date endDate
    string reason
    enum status "PENDING|APPROVED|ADMINISTERED|REJECTED"
    uuid requestedById "PH tạo"
    uuid handledById "y tá/GV xử lý"
    datetime handledAt
  }
  MedicineStatusHistory {
    uuid id PK
    string tenantId
    uuid requestId FK
    enum status "PENDING|APPROVED|ADMINISTERED|REJECTED"
    string note
    uuid actorId
    datetime createdAt
  }
  Incident {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    date date
    string type "Té ngã|Sốt|..."
    enum severity "LOW|MEDIUM|HIGH"
    string description
    string actionTaken
    uuid reportedById
  }
  Allergy {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    string allergen "UK (studentId,allergen)"
    string note
  }
  LeaveRequest {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    enum leaveType "SICK|FAMILY|OTHER"
    date startDate
    date endDate
    string reason
    string attachmentUrl
    enum status "PENDING|APPROVED|REJECTED"
    uuid requestedById
    uuid handledById
    datetime handledAt
    string decisionNote
  }
```

### B3 — Phân công nhân sự (Phase 1)

```mermaid
erDiagram
  User ||--o{ StaffAssignment : "staff"
  Classroom ||--o{ StaffAssignment : ""

  StaffAssignment {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid staffId FK
    uuid classroomId FK "nullable"
    int weekday "1=T2..7=CN"
    enum shift "MORNING|AFTERNOON|FULL_DAY"
    string duty "GV chính|Trực trưa|..."
    string note
    uuid createdById
  }
```

> **UK** `(staffId, weekday, shift)` — 1 người chỉ 1 phân công cho mỗi (thứ, ca).

### E — Học phí (Phase 1)

```mermaid
erDiagram
  Student ||--o{ TuitionInvoice : ""
  TuitionInvoice ||--o{ TuitionInvoiceItem : ""
  TuitionInvoice ||--o{ TuitionPayment : ""

  TuitionInvoice {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid studentId FK
    string invoiceNumber "UK (tenantId,invoiceNumber) HD-YYYY-NNNN"
    string period "2026-06|HK1..."
    date issueDate
    date dueDate
    decimal subtotal
    decimal discount
    decimal total
    decimal amountPaid
    enum status "UNPAID|PARTIAL|PAID|OVERDUE|CANCELED"
    string note
    uuid createdById
  }
  TuitionInvoiceItem {
    uuid id PK
    string tenantId
    uuid invoiceId FK
    string label
    int quantity
    decimal unitPrice
    decimal amount
  }
  TuitionPayment {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid invoiceId FK
    enum method "CASH|BANK_TRANSFER|VNPAY"
    enum status "PENDING|SUCCEEDED|FAILED|CANCELED"
    decimal amount
    string reference "ghi chú đối soát"
    string gatewayRef "UK (method,gatewayRef)"
    datetime paidAt
    json rawPayload
    uuid recordedById
  }
```

### F — Giao tiếp & nội dung (Phase 1)

```mermaid
erDiagram
  Classroom ||--o{ Announcement : "nullable"
  Classroom ||--o{ WeeklyMenu : "nullable"
  WeeklyMenu ||--o{ Meal : ""
  Classroom ||--o{ LessonPlan : ""
  LessonPlan ||--o{ Activity : ""
  Classroom ||--o{ Album : "nullable"
  Album ||--o{ AlbumPhoto : ""
  Media ||--o{ AlbumPhoto : ""

  Announcement {
    uuid id PK
    string tenantId
    uuid schoolId
    enum audience "ALL|PARENTS|TEACHERS|CLASS"
    uuid classroomId FK "nullable (bắt buộc khi CLASS)"
    string title
    string body
    datetime publishedAt "null = nháp"
    uuid authorId
  }
  WeeklyMenu {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid classroomId FK "nullable = toàn trường"
    date weekStart "thứ 2 đầu tuần"
    string note
    uuid createdById
  }
  Meal {
    uuid id PK
    string tenantId
    uuid menuId FK
    int weekday "1..7"
    enum mealType "BREAKFAST|LUNCH|SNACK|DINNER"
    string name
    string ingredients "dùng dò dị ứng"
  }
  LessonPlan {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid classroomId FK
    string week "2026-W27"
    string theme
    string note
    uuid authorId
  }
  Activity {
    uuid id PK
    string tenantId
    uuid planId FK
    int dayOfWeek "1..7"
    string startTime "08:00"
    string title
    string materials
  }
  Album {
    uuid id PK
    string tenantId
    uuid schoolId
    uuid classroomId FK "nullable"
    string title
    string description
    uuid createdById
  }
  AlbumPhoto {
    uuid id PK
    string tenantId
    uuid albumId FK
    uuid mediaId FK
    string caption
    int sortOrder
  }
```

> Giáo án gate `@RequireFeature lesson_plan`; album gate `@RequireFeature media_gallery`. `AlbumPhoto` tái dùng `Media` (đã nén webp).

### G — Thông báo / Observability (Phase 1)

```mermaid
erDiagram
  User ||--o{ Notification : ""
  User ||--o{ NotificationPreference : ""

  Notification {
    uuid id PK
    string tenantId
    uuid userId FK "người nhận"
    enum type "ATTENDANCE|DAILY_REPORT|ANNOUNCEMENT|INVOICE|MEDICINE|LEAVE|INCIDENT"
    string title
    string body
    string linkType "TuitionInvoice|Announcement|..."
    string linkId
    datetime readAt "null = chưa đọc"
    datetime createdAt
  }
  NotificationPreference {
    uuid id PK
    string tenantId
    uuid userId FK
    enum type "ATTENDANCE|...|INCIDENT"
    bool enabled "UK (userId,type); mặc định true"
  }
  UsageEvent {
    uuid id PK
    string tenantId "nullable"
    uuid userId "nullable"
    string type "login|signup|feature.*"
    json meta
    datetime createdAt
  }
```

> `AuditLog` (hành động nhạy cảm) đã định nghĩa ở phần Tầng A; `UsageEvent` + `AuditLog` được operator đọc xuyên tenant qua `prisma.system`.

---

## Bảng domain Phase 1 (A→G) — chỉ mục nhanh

> Mọi bảng dưới đây có `tenantId` (cô lập, trong `TENANT_KEY`) + (hầu hết) `schoolId`. Khoá/ràng buộc quan trọng liệt kê ở cột cuối. Soft-delete (`deletedAt`) áp cho `Classroom`, `Student` (ngoài các bảng Tầng A).

| Bảng | Quan hệ chính | Ràng buộc / ghi chú |
| --- | --- | --- |
| `Classroom` | School 1–N; `homeroomTeacherId`→User | unique `(schoolId, name)`; `capacity` |
| `Student` | School/Classroom N–1; soft-delete | quota STUDENTS |
| `StudentParent` | Student N–N User(PARENT) | PK `(studentId, parentId)`; `relationship`, `isPrimary` |
| `Attendance` | Student/Classroom | **unique `(studentId, date)`**; status PRESENT/LATE/ABSENT/EXCUSED |
| `DailyReport` | Student/Classroom | **unique `(studentId, date)`**; mood/meals/nap/activities |
| `PickupAuthorization` | Student; optional User(PARENT) | người được phép đưa/đón; status ACTIVE/REVOKED |
| `PickupLog` | Student; optional PickupAuthorization | nhật ký CHECK_IN/CHECK_OUT tại cổng trường |
| `HealthRecord` | Student | heightCm/weightKg/temperatureC (nguồn biểu đồ growth) |
| `MedicineRequest` + `MedicineStatusHistory` | Student; history N–1 request | status PENDING→APPROVED→ADMINISTERED/REJECTED; history ghi timeline |
| `Incident` | Student | severity LOW/MEDIUM/HIGH |
| `Allergy` | Student | **unique `(studentId, allergen)`**; dùng cảnh báo menu |
| `LeaveRequest` | Student | status PENDING→APPROVED/REJECTED (duyệt 1 lần) |
| `StaffAssignment` | User(staff)/Classroom? | **unique `(staffId, weekday, shift)`**; shift MORNING/AFTERNOON/FULL_DAY |
| `TuitionInvoice` + `TuitionInvoiceItem` + `TuitionPayment` | Student; items/payments N–1 invoice | invoice unique `(tenantId, invoiceNumber)` `HD-YYYY-NNNN`; payment unique `(method, gatewayRef)`; status UNPAID/PARTIAL/PAID/OVERDUE/CANCELED |
| `Announcement` | Classroom? | audience ALL/PARENTS/TEACHERS/CLASS; `publishedAt` null = nháp |
| `WeeklyMenu` + `Meal` | Classroom?; meals N–1 menu | mealType BREAKFAST/LUNCH/SNACK/DINNER; `ingredients` dùng dò dị ứng |
| `LessonPlan` + `Activity` | Classroom; activities N–1 plan | feature `lesson_plan` |
| `Album` + `AlbumPhoto` | Classroom?; photo→Media | feature `media_gallery`; `sortOrder` nối tiếp khi gắn nhiều batch |
| `Notification` | User (người nhận) | type ATTENDANCE/DAILY_REPORT/ANNOUNCEMENT/INVOICE/MEDICINE/LEAVE/INCIDENT; `readAt` |
| `NotificationPreference` | User | **unique `(userId, type)`**; mặc định bật, chỉ lưu khi ghi đè |
| `UsageEvent` | (tenant/user nullable) | type "login"… ; operator đọc xuyên tenant cho DAU/WAU/MAU |
| `AuditLog` (Tầng A, tái dùng) | — (global) | hành động nhạy cảm: member.create/activate/deactivate, student.delete, invoice.cancel/payment |

> **Lưu ý trạng thái thuê bao:** signup hiện tạo gói `free` **ACTIVE** (`trialEndsAt=null`); enum `Tenant.status`/`Subscription.status` vẫn giữ `TRIAL/TRIALING` cho cấu hình gói có `trialDays>0` (seed = 0). Xem [BILLING.md](./BILLING.md).

## Consent pháp lý (BL-046)

Bảng **system** (không tenant-scope; đọc xuyên tenant như `AuditLog`/`UsageEvent`):

| Bảng | Quan hệ / khóa | Ghi chú |
| --- | --- | --- |
| `ConsentDocument` | — (platform-global) | văn bản có phiên bản: `type` (`TERMS`/`PRIVACY`), `version`, `locale`, `title/summary/body`, `isActive`, `effectiveFrom`. **Unique `(type, locale, version)`**; mỗi (type, locale) chỉ 1 bản `isActive` (bản hiệu lực). Đổi giá/nội dung = tạo version mới, hạ `isActive` bản cũ. |
| `ConsentAcceptance` | `documentId`→`ConsentDocument` (RESTRICT); `userId`/`tenantId` (plain, nullable) | log **bất biến** ai-đồng-ý-gì-khi-nào: `docType`+`version` (snapshot), `email` (snapshot), `ipAddress`, `userAgent`, `acceptedAt`. Bằng chứng pháp lý — không sửa/xóa. |

> Enum `ConsentDocType`: `TERMS`, `PRIVACY`. Chủ trường đồng ý lúc signup (`/public/signup` ép `acceptConsent=true`); GV/PH/NV đồng ý ở gate đăng nhập (`/auth/me.pendingConsents` + `POST /consent/accept`). Bản nháp văn bản seed từ `prisma/consent-documents.ts` (⚠️ cần luật sư duyệt).
