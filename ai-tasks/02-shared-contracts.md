# 02 — Shared Contracts (types · zod · sdk · rbac)

> **Lớp hợp đồng** mà cả API và Mobile phụ thuộc. Xong tầng này → API & Mobile chạy song
> song được. Mọi enum/DTO phải khớp [`01-database-schema.md`](./01-database-schema.md).
> Trạng thái: 🔴 TODO · 🟡 WIP · 🟢 DONE · ⚪ BLOCKED (xem [README](./README.md)).
>
> **Bối cảnh cho AI mới:** đây là 4 package dùng chung. Quy ước hiện có để bắt chước:
> DTO `extends Timestamped`, field nullable dùng `| null`, ngày trả ra **string ISO**
> (xem [`shared-types/src/student.ts`](../packages/shared-types/src/student.ts)). Zod tái
> dùng `idSchema/passwordSchema/paginationQuerySchema` (xem
> [`shared-utils/src/schemas.ts`](../packages/shared-utils/src/schemas.ts)). SDK: mỗi method
> là wrapper mỏng quanh `api.get/post` trả `ApiResponse<T>` (SDK tự unwrap) — xem
> [`shared-api-client/src/endpoints.ts`](../packages/shared-api-client/src/endpoints.ts).

---

## SC-1 · `shared-types` — Enums & DTO

**Trạng thái: 🔴 TODO** · Phụ thuộc: DB-1 (enum Prisma đã chốt).

**Việc cần làm**

- [ ] **Enums** (`src/enums.ts`): thêm bản TS khớp Prisma, **value đúng chữ** (vd
  `ReportMood.HAPPY = 'HAPPY'`): `ReportMood`, `NapQuality`, `LeaveType`, `LeaveStatus`,
  `LessonPlanStatus`, `DayOfWeek`, `MealType`, `NotificationType`, `DevicePlatform`,
  `ConversationType`, `PaymentProvider`, `PaymentIntentStatus`, `InvoiceItemKind`.
- [ ] **DTO mới** (mỗi nhóm 1 file, re-export ở `src/index.ts`):
  - `src/lesson-plan.ts` → `LessonPlanDTO`, `LessonActivityDTO`, `CreateLessonPlanRequest`,
    `UpsertLessonActivityRequest`.
  - `src/menu.ts` → `MenuItemDTO`, `WeeklyMenuDTO` (gộp 5 ngày để màn P14 render 1 lần),
    `CreateMenuItemRequest`, `StudentAllergyDTO`, `CreateStudentAllergyRequest`.
  - `src/leave.ts` → `LeaveRequestDTO`, `CreateLeaveRequest`, `ReviewLeaveRequest`.
  - `src/messaging.ts` → `ConversationDTO` (kèm `lastMessage`, `unreadCount`, đối phương),
    `MessageDTO`, `SendMessageRequest`, `CreateConversationRequest`.
  - `src/notification.ts` → `NotificationDTO`, `RegisterDeviceRequest`, `MarkReadRequest`.
  - `src/dashboard.ts` → `ParentHomeSummaryDTO`, `TeacherHomeSummaryDTO` (cho M3a/M3b).
- [ ] **DTO sửa**:
  - `src/finance.ts` → thêm `InvoiceLineItemDTO`, `PaymentIntentDTO`,
    `CreatePaymentIntentRequest`; mở rộng `TuitionInvoiceDTO` (`lineItems`, `total`).
  - `src/health.ts` → `MedicineAdministrationDTO`, `ApproveMedicineRequest`,
    `RejectMedicineRequest`, `AdministerMedicineRequest`.
  - `src/report.ts` → `DailyReportDTO.mood: ReportMood`, `napQuality: NapQuality`.
  - `src/announcement.ts` → thêm `coverMediaUrl: string | null`.
  - `src/student.ts` → thêm `allergies: StudentAllergyDTO[]`,
    `parents: { id; fullName; relationship; isPrimary }[]` (cho `student-detail` M5).
- [ ] **Common** (`src/common.ts`): thêm `CursorPaginated<T>` 🌐 (cho attendance/messages dài)
  bên cạnh `Paginated<T>` offset hiện có.

**Done when:** `pnpm --filter @kimthanh/shared-types build` xanh; `index.ts` re-export hết;
không `any`.

---

## SC-2 · `shared-utils` — Zod schemas (`src/schemas.ts`)

**Trạng thái: 🔴 TODO** · Phụ thuộc: SC-1.

**Việc cần làm**

- [ ] `createLessonPlanSchema`, `upsertLessonActivitySchema` (validate `startTime`/`endTime`
  dạng `HH:mm`, `dayOfWeek` = `z.nativeEnum(DayOfWeek)`).
- [ ] `createMenuItemSchema` (`mealType` nativeEnum, `calories ≥ 0`, `date`).
- [ ] `createStudentAllergySchema`.
- [ ] `createLeaveRequestSchema` (`endDate ≥ startDate` qua `.refine`, `reason` min 1),
  `reviewLeaveSchema` (status + reviewNote; reject yêu cầu note).
- [ ] `sendMessageSchema` (`.refine`: phải có `body` **hoặc** `mediaId`),
  `createConversationSchema`.
- [ ] `registerDeviceSchema` (`token` min length, `platform` nativeEnum),
  `markNotificationsReadSchema` (`ids: string[]` **hoặc** `all: true`).
- [ ] `createPaymentIntentSchema` (`invoiceId`, `provider` nativeEnum).
- [ ] `approveMedicineSchema` / `rejectMedicineSchema` (reason bắt buộc khi reject) /
  `administerMedicineSchema` (`administeredAt`, `note?`).
- [ ] `markAttendanceBulkSchema` (mảng records — cho `attendance-mark` M6 lưu 1 lần).
- [ ] `changePasswordSchema` (`oldPassword`, `newPassword = passwordSchema`) — `profile` M16.
- [ ] **Sửa** `createDailyReportSchema`: `mood`/`napQuality` → `z.nativeEnum(...)`.

**Done when:** build xanh; mỗi schema có `export type XInput = z.infer<...>`; API dùng lại
được (không định nghĩa Zod trùng trong `apps/api`).

---

## SC-3 · `shared-api-client` — SDK endpoints (`src/endpoints.ts`)

**Trạng thái: 🔴 TODO** · Phụ thuộc: SC-1.

**Việc cần làm** — thêm nhóm endpoint, đăng ký trong `createApiSdk`, type `ApiSdk` tự suy ra:

- [ ] `createLessonPlanEndpoints` → `list({classroomId,year,weekNumber})`, `getById`,
  `create`, `update`, `addActivity`, `removeActivity`.
- [ ] `createMenuEndpoints` → `getWeek({schoolId?,weekStartDate,studentId?})`, `upsertItem` 🌐.
- [ ] `createLeaveEndpoints` → `list`, `create`, `review`, `cancel`.
- [ ] `createMessagingEndpoints` → `listConversations`, `getMessages(conversationId,cursor)`,
  `sendMessage`, `createConversation`, `markRead`.
- [ ] `createNotificationEndpoints` → `list(cursor)`, `markRead`, `registerDevice`,
  `unregisterDevice`.
- [ ] **Mở rộng** `createFinanceEndpoints` → `getInvoice(id)`, `createPaymentIntent`,
  `getPaymentIntent(id)`.
- [ ] **Mở rộng** `createHealthEndpoints` → `getMedicineRequest(id)`, `approve`, `reject`,
  `administer`.
- [ ] **Mở rộng** `createAttendanceEndpoints` → `markBulk(body)`,
  `historyForStudent({studentId,from,to})`.
- [ ] **Mở rộng** `createStudentEndpoints` → `getAllergies(id)`, `addAllergy`, `removeAllergy`.
- [ ] **Mở rộng** `createAuthEndpoints` → `changePassword`, `refresh` (nếu chưa expose).
- [ ] `createDashboardEndpoints` → `parentHome()`, `teacherHome()`.

**Done when:** build xanh; gõ `apiSdk.` trên cả mobile & web 🌐 autocomplete đủ method mới;
đường dẫn REST khớp đúng với controller ở [03-api-tasks.md](./03-api-tasks.md).

---

## SC-4 · `shared-auth` — RBAC (`src/rbac.ts`)

**Trạng thái: 🔴 TODO** · Phụ thuộc: — (có thể làm sớm).

**Bối cảnh:** `Permissions` là object string phẳng; `ROLE_PERMISSIONS` map role→permission.
Backend gate bằng `@Roles` + `hasPermission(role, Permissions.X)`; UI cũng dùng để ẩn/hiện.

**Việc cần làm**

- [ ] Thêm vào `Permissions`: `LESSON_READ`, `LESSON_WRITE`, `MENU_READ`, `MENU_WRITE` 🌐,
  `LEAVE_READ`, `LEAVE_WRITE`, `LEAVE_REVIEW`, `MESSAGE_READ`, `MESSAGE_WRITE`,
  `NOTIFICATION_READ`, `MEDICINE_ADMINISTER`, `PAYMENT_INITIATE`,
  `MEDICINE_REQUEST_CREATE` (tách khỏi `HEALTH_WRITE` để PH chỉ tạo y/c thuốc, không ghi
  hồ sơ y tế khác).
- [ ] Gán `ROLE_PERMISSIONS`:
  - **PARENT**: + `LESSON_READ`, `MENU_READ`, `LEAVE_READ`/`WRITE`, `MESSAGE_READ`/`WRITE`,
    `NOTIFICATION_READ`, `MEDICINE_REQUEST_CREATE`, `PAYMENT_INITIATE`.
  - **TEACHER**: + `LESSON_READ`/`WRITE`, `MENU_READ`, `LEAVE_READ`/`REVIEW`,
    `MESSAGE_READ`/`WRITE`, `NOTIFICATION_READ`.
  - **NURSE**: + `MEDICINE_ADMINISTER`, `LEAVE_READ`, `NOTIFICATION_READ`,
    `MESSAGE_READ`/`WRITE`.
  - **FINANCE**: + `NOTIFICATION_READ`.
  - **ADMIN**: + tất cả `*_WRITE`/`*_REVIEW`/`MENU_WRITE` (toàn trường) 🌐.
- [ ] Đồng bộ tài liệu [`docs/product/permissions-matrix.md`](../docs/product/permissions-matrix.md).

**Done when:** build xanh; `hasPermission(UserRole.PARENT, Permissions.PAYMENT_INITIATE)`
trả `true`, và PARENT **không** có `MENU_WRITE`/`LEAVE_REVIEW`.

---

## Definition of Done (cả Phase 2)

- [ ] `pnpm -w build` + `pnpm -w typecheck` xanh, không `any`.
- [ ] Enum khớp 3 nơi (Prisma ↔ types ↔ Zod) — rà theo checklist DB-1.
- [ ] `ApiSdk` autocomplete đủ mọi endpoint mới trên `apps/mobile` và `apps/web` 🌐.
</content>
