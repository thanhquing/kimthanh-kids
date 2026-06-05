# 01 — Database Schema (thiết kế đầy đủ, được phép rebuild)

> Được phép **đập đi xây lại** `apps/api/prisma/schema.prisma`. Thiết kế dưới đây là
> bản **có thẩm quyền** cho cả Mobile **và** Web Dashboard tương lai.
> 🌐 = field/model **reserved cho Web Dashboard** (admin/finance/nurse) — mobile chưa
> dùng nhưng phải tồn tại để không phải migrate phá vỡ về sau.

## Nguyên tắc thiết kế

1. **PK = UUID** (`@default(uuid())`), tránh lộ thông tin tuần tự, dễ sharding/merge.
2. **Multi-tenant theo `schoolId`** ở **mọi** bảng nghiệp vụ (kể cả bảng con — denormalize
   `schoolId` xuống để index/scoping nhanh, không phải join lên `Student` mỗi lần).
3. **Audit cột chuẩn**: `createdAt`, `updatedAt`, và `deletedAt` (soft delete) cho mọi
   thực thể domain. Bảng join thuần và bảng log thì chỉ cần `createdAt`.
4. **Soft delete**: không xoá cứng dữ liệu trẻ em / tài chính / y tế. Query luôn lọc
   `deletedAt: null` (đặt trong Prisma middleware hoặc base repository).
5. **Tiền tệ**: `Decimal(12,2)`, không dùng `Float`. Default `currency = "VND"`.
6. **Thời gian**: `@db.Date` cho ngày thuần (điểm danh, hạn nộp); `DateTime` (UTC) cho
   mốc thời điểm. Client tự format theo timezone `Asia/Ho_Chi_Minh`.
7. **Enum đồng bộ 3 nơi**: Prisma ↔ `packages/shared-types/src/enums.ts` ↔ Zod
   (`packages/shared-utils/src/schemas.ts`). Giá trị enum là **string ổn định** (đừng đổi).
8. **Index theo truy vấn thực tế của mock** (đánh dấu ở từng model).
9. **Bảo mật dữ liệu nhạy cảm** (y tế, liên hệ khẩn): xem mục [Bảo mật](#bảo-mật--quyền-riêng-tư).
10. **Không khoá vào mobile**: mọi thực thể đều có đủ field cho dashboard quản trị
    (vd `LessonPlan.status`, `Invoice.lineItems`, audit log, `createdById`).

---

## Task tracker (DB-*)

> Trạng thái: 🔴 TODO · 🟡 WIP · 🟢 DONE · ⚪ BLOCKED (xem [README](./README.md)). Mỗi task
> trỏ tới phần chi tiết bên dưới — code Prisma là spec, copy vào `schema.prisma` rồi migrate.

| ID | Việc | Trạng thái | Chi tiết |
|----|------|-----------|----------|
| **DB-1** | Thêm 13 enum mới | 🔴 TODO | [§B](#b-enum-mới--bổ-sung) |
| **DB-2** | Sửa model cũ (User/Student/Classroom/DailyReport/Announcement/Invoice/Medicine) | 🔴 TODO | [§A](#sửa-đổi-trên-model-cũ) |
| **DB-3** | Model giáo án `LessonPlan` + `LessonActivity` | 🔴 TODO | [§C1](#c1-giáo-án--lessonplan--lessonactivity-mock-lesson-planhtml-t8) |
| **DB-4** | Model thực đơn `MenuItem` + `StudentAllergy` | 🔴 TODO | [§C2](#c2-thực-đơn--menuitem--dị-ứng-studentallergy-mock-menu-weeklyhtml-p14) |
| **DB-5** | Model `LeaveRequest` | 🔴 TODO | [§C3](#c3-xin-nghỉ-học--leaverequest-mock-leave-requesthtml-p15) |
| **DB-6** | Messaging `Conversation`/`Participant`/`Message` + `Notification`/`DeviceToken` | 🔴 TODO | [§C4](#c4-tin-nhắn--conversation--conversationparticipant--message-mock-t12-p16) · [§C5](#c5-thông-báo-đẩy--notification--devicetoken-mock-notificationshtml-m17) |
| **DB-7** | Finance `InvoiceLineItem`/`PaymentIntent` + `MedicineAdministration` + `AuditLog` | 🔴 TODO | [§C6](#c6-thanh-toán--invoicelineitem--paymentintent-mock-payment-checkouthtml-p13) · [§C7](#c7-audit-log--auditlog--cho-dashboard-bảo-mật) · [§C8](#c8-lịch-sử-cho-uống-thuốc--medicineadministration-mock-medicine-detailhtml-m12) |
| **DB-8** | Migrate + seed + rà bảo mật/scoping | 🔴 TODO | [§Bảo mật](#bảo-mật--quyền-riêng-tư) · [§Migration](#migration--seed) |

---

## A. Giữ lại từ schema hiện tại (vẫn đúng)

Các model sau **giữ nguyên ý tưởng**, chỉ bổ sung như ghi chú: `School`, `User`,
`RefreshToken`, `Classroom`, `Student`, `StudentParent`, `Attendance`, `DailyReport`,
`MedicineRequest`, `HealthRecord`, `Incident`, `TuitionInvoice`, `Payment`, `Announcement`,
`Media` (+ `MediaStudent`, `MediaReport`). Tham chiếu bản gốc:
[`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).

### Sửa đổi trên model cũ

- [ ] **`User`**
  - [ ] Thêm `lastLoginAt DateTime?` 🌐 (dashboard hiển thị hoạt động).
  - [ ] Thêm relation `devices DeviceToken[]`, `notifications Notification[]`,
        `conversations ConversationParticipant[]`, `messagesSent Message[]`,
        `leaveRequestsCreated LeaveRequest[]`, `leaveRequestsReviewed LeaveRequest[]`,
        `lessonPlansAuthored LessonPlan[]`.
  - [ ] (Bảo mật) Thêm `failedLoginCount Int @default(0)` + `lockedUntil DateTime?` 🌐
        để chặn brute-force (tuỳ chọn, xem API tasks).
- [ ] **`Student`**
  - [ ] Thêm `allergies StudentAllergy[]` (dùng cho cảnh báo thực đơn — `menu-weekly` P14).
  - [ ] Thêm `leaveRequests LeaveRequest[]`.
  - [ ] Thêm `bloodType String?` 🌐, `emergencyContact String?` 🌐 (hồ sơ chi tiết).
- [ ] **`Classroom`**
  - [ ] Thêm relations `lessonPlans LessonPlan[]`, `conversations Conversation[]`.
  - [ ] Thêm `assistantTeacherId String?` 🌐 (giáo viên phụ — lớp 24 bé thường có 2 cô).
- [ ] **`DailyReport`** (mock `report-compose` M8 / `report-feed` M9 dùng **chip enum**, không phải free text thuần)
  - [ ] Đổi `mood String?` → `mood ReportMood?` (enum). Giữ `note` free text.
  - [ ] Thêm `napQuality NapQuality?` (chip: Ngủ ngon / Khó ngủ / Không ngủ).
  - [ ] Giữ `meals`, `activities`, `note` dạng text như mock.
- [ ] **`Announcement`** (mock `announcements-feed` M14 có **ảnh bìa**)
  - [ ] Thêm `coverMediaId String?` + relation `coverMedia Media?`.
  - [ ] Thêm `attachments AnnouncementMedia[]` (nhiều ảnh — tuỳ chọn, dễ mở rộng).
- [ ] **`TuitionInvoice`** (mock `payment-checkout` P13 có **chi tiết khoản thu**)
  - [ ] Thêm relation `lineItems InvoiceLineItem[]`.
  - [ ] Thêm `paymentIntents PaymentIntent[]`.
  - [ ] Thêm `issuedAt DateTime @default(now())` 🌐.
- [ ] **`MedicineRequest`** (mock `medicine-detail` M12 có **timeline cho uống nhiều lần**)
  - [ ] Thêm relation `administrations MedicineAdministration[]`.
  - [ ] Thêm `rejectionReason String?` (nút "Từ chối" ở `medicine-approve` T9).

---

## B. Enum mới / bổ sung

```prisma
enum ReportMood {        // report-compose M8: 😊 Vui / 😐 Bình thường / 😴 Mệt / 😢 Quấy
  HAPPY
  NEUTRAL
  TIRED
  UPSET
}

enum NapQuality {        // report-compose M8
  SLEPT_WELL
  HARD_TO_SLEEP
  NO_NAP
}

enum LeaveType {         // leave-request P15: Ốm / Việc gia đình / Khác
  SICK
  FAMILY
  OTHER
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum LessonPlanStatus {  // 🌐 dashboard duyệt giáo án
  DRAFT
  PUBLISHED
}

enum DayOfWeek {         // lesson-plan T8, menu-weekly P14 (T2..T6)
  MON
  TUE
  WED
  THU
  FRI
  SAT
  SUN
}

enum MealType {          // menu-weekly P14: Sáng / Trưa / Xế
  BREAKFAST
  LUNCH
  SNACK
}

enum NotificationType {  // notifications M17 (icon + màu theo loại)
  ATTENDANCE
  REPORT
  ANNOUNCEMENT
  INVOICE
  MEDICINE
  MESSAGE
  LEAVE
  SYSTEM
}

enum DevicePlatform {
  IOS
  ANDROID
  WEB                    // 🌐 web push sau này
}

enum ConversationType {
  DIRECT                 // 1-1 PH ↔ GV (chat-parent T12, chat-teacher P16)
  GROUP                  // 🌐 mở rộng: nhóm lớp
}

enum PaymentProvider {   // payment-checkout P13
  VNPAY
  MOMO
  BANK_TRANSFER
  CASH                   // 🌐 thu tiền mặt tại trường (dashboard finance)
}

enum PaymentIntentStatus {
  CREATED
  PENDING
  SUCCEEDED
  FAILED
  EXPIRED
  CANCELLED
}

enum InvoiceItemKind {   // payment-checkout P13: Học phí cơ bản / Tiền ăn / Học liệu
  TUITION
  MEALS
  MATERIALS
  TRANSPORT              // 🌐
  OTHER
}
```

> Nhớ thêm bản sao tương ứng vào `shared-types/src/enums.ts` (xem
> [`02-shared-contracts.md`](./02-shared-contracts.md)).

---

## C. Model mới

### C1. Giáo án — `LessonPlan` + `LessonActivity` (mock `lesson-plan.html` T8)

```prisma
model LessonPlan {
  id          String           @id @default(uuid())
  schoolId    String
  school      School           @relation(fields: [schoolId], references: [id])
  classroomId String
  classroom   Classroom        @relation(fields: [classroomId], references: [id])
  weekNumber  Int              // "Tuần 22"
  year        Int
  theme       String           // "Chủ đề: Thiên nhiên quanh em"
  status      LessonPlanStatus @default(DRAFT)   // 🌐 duyệt qua dashboard
  authorId    String
  author      User             @relation("LessonAuthor", fields: [authorId], references: [id])

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  activities LessonActivity[]

  @@unique([classroomId, year, weekNumber])
  @@index([schoolId])
  @@map("lesson_plans")
}

model LessonActivity {
  id           String     @id @default(uuid())
  lessonPlanId String
  lessonPlan   LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)
  dayOfWeek    DayOfWeek                       // badge "Thứ 2/3/4"
  startTime    String                          // "8:30" (giờ địa phương, lưu HH:mm)
  endTime      String                          // "9:15"
  title        String                          // "Khám phá lá cây mùa hè"
  description  String?                         // mô tả hoạt động
  materials    String?                         // "Lá, giấy A3, màu nước"
  order        Int        @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([lessonPlanId, dayOfWeek])
  @@map("lesson_activities")
}
```

### C2. Thực đơn — `MenuItem` + dị ứng `StudentAllergy` (mock `menu-weekly.html` P14)

> Thực đơn theo **trường** (cả trường ăn chung), không theo lớp. Cảnh báo dị ứng tính
> ở tầng nghiệp vụ: so `StudentAllergy.allergen` với `MenuItem` (đánh dấu thủ công hoặc
> nhập danh sách nguyên liệu — v1 chỉ cần cảnh báo từ allergy của bé).

```prisma
model MenuItem {
  id          String   @id @default(uuid())
  schoolId    String
  school      School   @relation(fields: [schoolId], references: [id])
  date        DateTime @db.Date                 // "Thứ Hai 26/05/2026"
  mealType    MealType                          // BREAKFAST/LUNCH/SNACK
  servingTime String?                           // "7:30", "11:15", "14:30"
  dishName    String                            // "Cháo gà bí đỏ + sữa tươi"
  description String?                           // "370 kcal · giàu vitamin A"
  calories    Int?                              // tách số kcal để lọc/thống kê 🌐

  createdById String?                           // 🌐 ai tạo (bếp/dashboard)
  createdBy   User?    @relation("MenuAuthor", fields: [createdById], references: [id])

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@unique([schoolId, date, mealType])
  @@index([schoolId, date])
  @@map("menu_items")
}

model StudentAllergy {
  id        String   @id @default(uuid())
  studentId String
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  allergen  String                              // "Tôm"
  note      String?                             // "đã ghi nhận, bếp loại trừ"

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([studentId, allergen])
  @@index([studentId])
  @@map("student_allergies")
}
```

### C3. Xin nghỉ học — `LeaveRequest` (mock `leave-request.html` P15)

```prisma
model LeaveRequest {
  id            String      @id @default(uuid())
  schoolId      String
  school        School      @relation(fields: [schoolId], references: [id])
  studentId     String
  student       Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  requestedById String
  requestedBy   User        @relation("LeaveRequester", fields: [requestedById], references: [id])
  type          LeaveType                       // SICK/FAMILY/OTHER
  startDate     DateTime    @db.Date
  endDate       DateTime    @db.Date
  reason        String
  attachmentId  String?                         // "Tải giấy khám bệnh"
  attachment    Media?      @relation(fields: [attachmentId], references: [id])
  status        LeaveStatus @default(PENDING)
  reviewedById  String?
  reviewedBy    User?       @relation("LeaveReviewer", fields: [reviewedById], references: [id])
  reviewedAt    DateTime?
  reviewNote    String?

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([schoolId, status])
  @@index([studentId, startDate])
  @@map("leave_requests")
}
```

### C4. Tin nhắn — `Conversation` + `ConversationParticipant` + `Message` (mock T12, P16)

```prisma
model Conversation {
  id          String           @id @default(uuid())
  schoolId    String
  school      School           @relation(fields: [schoolId], references: [id])
  type        ConversationType @default(DIRECT)
  // ngữ cảnh tuỳ chọn: hội thoại "về bé X / lớp Y"
  studentId   String?
  student     Student?         @relation(fields: [studentId], references: [id])
  classroomId String?
  classroom   Classroom?       @relation(fields: [classroomId], references: [id])
  lastMessageAt DateTime?                       // sort hộp thư (chat-parent T12)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  participants ConversationParticipant[]
  messages     Message[]

  @@index([schoolId, lastMessageAt])
  @@map("conversations")
}

model ConversationParticipant {
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastReadAt     DateTime?                      // tính "unread badge" (b-red '2')
  mutedUntil     DateTime?

  createdAt DateTime @default(now())

  @@id([conversationId, userId])
  @@index([userId])
  @@map("conversation_participants")
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id])
  body           String?                        // text (có thể null nếu chỉ gửi ảnh)
  mediaId        String?                        // chat-teacher P16 gửi ảnh
  media          Media?       @relation(fields: [mediaId], references: [id])

  createdAt DateTime  @default(now())
  editedAt  DateTime?
  deletedAt DateTime?

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

> **Unread badge**: `unreadCount = count(messages WHERE createdAt > participant.lastReadAt
> AND senderId != me)`. Tính trong service, không lưu cứng để tránh lệch.

### C5. Thông báo đẩy — `Notification` + `DeviceToken` (mock `notifications.html` M17)

```prisma
model Notification {
  id        String           @id @default(uuid())
  schoolId  String
  school    School           @relation(fields: [schoolId], references: [id])
  userId    String                              // người nhận
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType                    // chọn icon/màu ở UI
  title     String                              // "Bé Minh đã được điểm danh"
  body      String?                             // "Có mặt lúc 7:45 sáng"
  // deep-link tới thực thể nguồn (mở đúng màn hình khi bấm)
  entityType String?                            // "attendance" | "report" | ...
  entityId   String?
  data       Json?                              // payload mở rộng (dễ mở rộng)
  readAt     DateTime?

  createdAt DateTime @default(now())

  @@index([userId, readAt, createdAt])
  @@map("notifications")
}

model DeviceToken {
  id         String         @id @default(uuid())
  userId     String
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String         @unique             // Expo push token
  platform   DevicePlatform
  lastUsedAt DateTime       @default(now())
  revokedAt  DateTime?

  createdAt DateTime @default(now())

  @@index([userId])
  @@map("device_tokens")
}
```

### C6. Thanh toán — `InvoiceLineItem` + `PaymentIntent` (mock `payment-checkout.html` P13)

```prisma
model InvoiceLineItem {
  id        String          @id @default(uuid())
  invoiceId String
  invoice   TuitionInvoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  kind      InvoiceItemKind                     // TUITION/MEALS/MATERIALS...
  label     String                              // "Tiền ăn (22 ngày)"
  amount    Decimal         @db.Decimal(12, 2)  // 550000
  quantity  Int?                                // 22 (số ngày) — tuỳ chọn
  unitPrice Decimal?        @db.Decimal(12, 2)

  createdAt DateTime @default(now())

  @@index([invoiceId])
  @@map("invoice_line_items")
}

model PaymentIntent {
  id          String              @id @default(uuid())
  schoolId    String
  school      School              @relation(fields: [schoolId], references: [id])
  invoiceId   String
  invoice     TuitionInvoice      @relation(fields: [invoiceId], references: [id])
  provider    PaymentProvider                   // VNPAY/MOMO/BANK_TRANSFER
  amount      Decimal             @db.Decimal(12, 2)
  currency    String              @default("VND")
  status      PaymentIntentStatus @default(CREATED)
  providerRef String?                           // mã giao dịch cổng (idempotency)
  redirectUrl String?                           // URL chuyển sang cổng
  rawPayload  Json?                             // lưu callback/webhook để đối soát
  expiresAt   DateTime?
  paidAt      DateTime?
  createdById String?
  createdBy   User?               @relation("PaymentIntentCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([provider, providerRef])
  @@index([invoiceId, status])
  @@index([schoolId, status])
  @@map("payment_intents")
}
```

> Khi `PaymentIntent.status = SUCCEEDED` (webhook) → tạo `Payment` (đối soát) và set
> `TuitionInvoice.status = PAID`. Giữ `Payment` cũ làm sổ cái thu (kể cả thu tiền mặt 🌐).

### C7. Audit log — `AuditLog` 🌐 (cho dashboard, bảo mật)

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  schoolId   String?
  actorId    String?                            // ai thực hiện
  action     String                             // "medicine.approve", "invoice.create"
  entityType String
  entityId   String
  metadata   Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([schoolId, entityType, createdAt])
  @@index([actorId])
  @@map("audit_logs")
}
```

> Tối thiểu ghi log cho: duyệt/từ chối thuốc, tạo/sửa hoá đơn, thanh toán, đăng nhập thất
> bại, đổi vai trò. Mobile không hiển thị, nhưng `medicine-detail` (M12) timeline **đọc
> từ** `MedicineAdministration` + audit.

### C8. Lịch sử cho uống thuốc — `MedicineAdministration` (mock `medicine-detail.html` M12)

```prisma
model MedicineAdministration {
  id                String          @id @default(uuid())
  medicineRequestId String
  medicineRequest   MedicineRequest @relation(fields: [medicineRequestId], references: [id], onDelete: Cascade)
  administeredById  String
  administeredBy    User            @relation("MedicineAdministrator", fields: [administeredById], references: [id])
  administeredAt    DateTime                     // "26/05 lúc 14:05"
  note              String?                      // "Bé uống ngoan, không phản ứng phụ."

  createdAt DateTime @default(now())

  @@index([medicineRequestId, administeredAt])
  @@map("medicine_administrations")
}
```

---

## D. Sơ đồ quan hệ (rút gọn)

```
School 1──* User, Classroom, Student, Announcement, MenuItem, LeaveRequest,
            Conversation, Notification, PaymentIntent, TuitionInvoice, AuditLog
Classroom 1──* Student, Attendance, DailyReport, LessonPlan, Conversation
Student  *──* User (StudentParent)              // PH ↔ con
Student  1──* Attendance, DailyReport, MedicineRequest, HealthRecord, Incident,
              LeaveRequest, StudentAllergy, TuitionInvoice
TuitionInvoice 1──* InvoiceLineItem, PaymentIntent, Payment
MedicineRequest 1──* MedicineAdministration
LessonPlan 1──* LessonActivity
Conversation 1──* ConversationParticipant, Message
User 1──* DeviceToken, Notification
Media 1──* (Announcement.cover, Message.media, LeaveRequest.attachment, MediaStudent, MediaReport)
```

---

## Bảo mật & quyền riêng tư

- [ ] **Record-level scoping** (tầng service, không chỉ route):
  - PARENT chỉ đọc dữ liệu **con của mình** (qua `StudentParent`): students, attendance,
    reports, invoices, medicine, leave, allergies, conversations có mình là participant.
  - TEACHER chỉ thao tác **lớp chủ nhiệm** của mình (attendance, report, lesson, roster).
  - NURSE: y tế toàn trường (`medicine`, `health`, `incident`); không xem tài chính.
  - FINANCE: tài chính toàn trường; không xem y tế.
  - SUPER_ADMIN: bỏ qua `schoolId` filter; ADMIN: trong `schoolId` của mình. 🌐
- [ ] **Multi-tenant**: mọi query bắt buộc filter `schoolId = actor.schoolId` (trừ
      SUPER_ADMIN). Viết helper `scopeBySchool(actor, where)` dùng chung.
- [ ] **Dữ liệu y tế nhạy cảm** (`HealthRecord`, `MedicineRequest`, `StudentAllergy`,
      `LeaveRequest.reason`): chỉ NURSE/ADMIN/GV-chủ-nhiệm/PH-của-bé đọc được. Cân nhắc
      mã hoá cột ở mức ứng dụng nếu lưu chẩn đoán chi tiết (v2).
- [ ] **Chat**: chỉ `ConversationParticipant` đọc được `Message`; chặn PH chat PH khác.
- [ ] **PaymentIntent**: idempotent theo `(provider, providerRef)`; xác thực chữ ký
      webhook (VNPay/Momo secure hash) trước khi đổi trạng thái hoá đơn.
- [ ] **DeviceToken**: revoke khi logout; không gửi push tới token đã revoke.
- [ ] **Soft delete** + **AuditLog** cho hành động nhạy cảm (thuốc, tài chính, vai trò).
- [ ] **Refresh token rotation** (đã có) + bổ sung **reuse detection** (mục known-limitations).

## Migration & seed

- [ ] `pnpm --filter @kimthanh/api db:migrate` tạo migration mới (đặt tên `redesign_full_domain`).
- [ ] Cập nhật [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts): seed 1 `School`,
      users mẫu mỗi role (khớp `login.html` email mẫu), 1 lớp "Mầm A" 24 bé, vài
      `MenuItem`/`LessonPlan`/`Announcement`/`Notification` để mobile có data hiển thị.
- [ ] Giữ enum đồng bộ — checklist ở [`02-shared-contracts.md`](./02-shared-contracts.md).
</content>
