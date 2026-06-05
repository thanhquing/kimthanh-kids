# 03 — API Tasks (NestJS)

> Trạng thái mỗi task: 🔴 TODO · 🟡 WIP · 🟢 DONE · ⚪ BLOCKED (xem [README](./README.md)).
>
> **Bối cảnh cho AI mới:** backend ở [`apps/api`](../apps/api). Mỗi tính năng = 1 module
> trong `apps/api/src/modules/<x>/` gồm `*.module.ts` + `*.service.ts` + `*.controller.ts`
> + `dto/`, đăng ký vào `app.module.ts`. Đã có sẵn các module: auth, users, students,
> classrooms, attendance, reports, health, finance, announcements, media, i18n, prisma.
> Convention: [`docs/conventions/nestjs-guidelines.md`](../docs/conventions/nestjs-guidelines.md),
> [`docs/conventions/prisma-guidelines.md`](../docs/conventions/prisma-guidelines.md),
> [`docs/conventions/api-response-format.md`](../docs/conventions/api-response-format.md).
>
> **Luật chung cho MỌI endpoint (không được bỏ):** ① `@Roles(...)` route-level →
> ② **scope theo `schoolId` + record-level** trong service (PH chỉ con mình, GV chỉ lớp
> mình…) → ③ validate input bằng Zod (schema ở `shared-utils`) → ④ trả envelope
> `ApiResponse<T>`. Dữ liệu y tế/tài chính: thêm ghi `AuditLog`.

---

## API-0 · Hạ tầng dùng chung (làm TRƯỚC)

**Trạng thái: 🔴 TODO** · Phụ thuộc: DB-* (migrate xong), SC-* (contracts).

- [ ] Helper scoping tái dùng: `scopeBySchool(actor, where)`,
  `assertParentOwnsStudent(actor, studentId)`, `assertTeacherOwnsClassroom(actor, classroomId)`.
- [ ] Prisma soft-delete middleware: mặc định lọc `deletedAt: null`.
- [ ] `NotificationService.emit({userId, type, title, body, entityType, entityId, data})` —
  ghi `Notification` + đẩy Expo push tới `DeviceToken` còn hiệu lực. Mọi module khác gọi
  service này như side-effect (không tự viết push).
- [ ] `AuditService.log({actorId, schoolId, action, entityType, entityId, metadata, ip})`.

**Done when:** 3 helper + 2 service có unit test cơ bản; 1 module mẫu dùng được chúng.

---

## API-A · Dashboard tổng hợp — mock `home-parent` M3a, `home-teacher` M3b

**Trạng thái: 🔴 TODO** · Module mới `dashboard/`.

Hai màn home là **aggregate**; tạo endpoint riêng để mobile khỏi gọi 5 API.

- [ ] `GET /dashboard/parent-home` (PARENT) → `ParentHomeSummaryDTO`: `children[]` + trạng
  thái điểm danh **hôm nay**, `todayMoment` (report/ảnh mới nhất), `recentAnnouncements`
  (2 mới nhất), `unpaidInvoices` (count + tổng tiền).
- [ ] `GET /dashboard/teacher-home` (TEACHER) → `TeacherHomeSummaryDTO`: `classroom`
  (tên + sĩ số), `attendanceToday {present,late,absent}`, `pendingActions`
  (số bé chưa điểm danh + số report thiếu).

**Done when:** PH chỉ thấy con mình, GV chỉ thấy lớp mình; số liệu khớp ô trên mock.

---

## API-B · Auth — mock `login` M1, `register` M2, `profile` M16, `splash` M0

**Trạng thái: 🔴 TODO** · Module có sẵn `auth/`.

- [ ] Giữ `/auth/login`, `/register`, `/logout`, `/me`, `/refresh`.
- [ ] **Mới** `POST /auth/change-password` (đã đăng nhập; verify old, set new = `passwordSchema`).
- [ ] `register` **chỉ** tạo role PARENT (bỏ field `role` ở public DTO — chống tự nâng quyền).
- [ ] (Bảo mật) rate-limit `/login`; tăng `User.failedLoginCount`/`lockedUntil`.

**Done when:** đổi mật khẩu hoạt động; không thể register thành ADMIN; `splash` chỉ cần `/me`.

---

## API-C · Students — mock `children-list` M4, `student-detail` M5

**Trạng thái: 🔴 TODO** · Module có sẵn `students/`.

- [ ] Giữ `GET /students?classroomId`, `GET /students/:id`.
- [ ] `GET /students/:id` trả kèm `parents[]` (relationship/isPrimary), `allergies[]`, trạng
  thái hôm nay (cho tab Tổng quan M5).
- [ ] **Mới** `GET/POST /students/:id/allergies`, `DELETE /students/:id/allergies/:allergyId`
  (NURSE/TEACHER/ADMIN ghi; PARENT đọc).
- [ ] Scope: PARENT chỉ con mình; TEACHER chỉ bé trong lớp mình.

**Done when:** PH A gọi student của con PH B → 403/404; M5 có đủ data render mọi tab.

---

## API-D · Attendance — mock `attendance-mark` M6, `attendance-history` M7, `class-roster` T4

**Trạng thái: 🔴 TODO** · Module có sẵn `attendance/`.

- [ ] Giữ `GET /attendance?classroomId&date`.
- [ ] **Mới** `POST /attendance/bulk` (TEACHER) — lưu một lần nhiều bé (M6 "Lưu thay đổi (5)");
  upsert theo unique `(studentId, date)`.
- [ ] **Mới** `GET /attendance/history?studentId&from&to` (PARENT/TEACHER) — trả đủ cho lịch
  tô màu + list "Gần đây" + tổng `{present,late,absent}` (M7).
- [ ] Side-effect: điểm danh xong → `NotificationService.emit(ATTENDANCE)` cho PH.

**Done when:** bulk lưu đúng, idempotent; lịch tháng M7 render từ data thật.

---

## API-E · Reports — mock `report-compose` M8, `report-feed` M9

**Trạng thái: 🔴 TODO** · Module có sẵn `reports/`.

- [ ] Giữ `POST /reports`, `GET /students/:id/reports`.
- [ ] `mood`/`napQuality` nhận **enum** (`ReportMood`/`NapQuality`).
- [ ] Cho phép `mediaIds[]` → gắn `MediaReport` (upload qua API-M).
- [ ] Side-effect: tạo report → `Notification(REPORT)` cho PH.

**Done when:** chip mood/nap lưu enum; PH chỉ đọc report con mình; GV tạo cho bé lớp mình.

---

## API-F · Lesson plans 🆕 — mock `lesson-plan` T8

**Trạng thái: 🔴 TODO** · Module mới `lesson-plans/`.

- [ ] `GET /lesson-plans?classroomId&year&weekNumber` → 1 plan + `activities` (sort `order`).
- [ ] `POST /lesson-plans` (TEACHER) tạo plan tuần (theme).
- [ ] `POST /lesson-plans/:id/activities`, `PATCH .../activities/:aid`,
  `DELETE .../activities/:aid` (T8 "+ Hoạt động").
- [ ] `PATCH /lesson-plans/:id` đổi theme/status (DRAFT↔PUBLISHED 🌐).
- [ ] Scope: TEACHER lớp mình; PARENT 🌐 đọc PUBLISHED của lớp con (nếu bật).

**Done when:** T8 render đúng 1 tuần với nhiều hoạt động theo thứ.

---

## API-G · Menu + allergies 🆕 — mock `menu-weekly` P14

**Trạng thái: 🔴 TODO** · Module mới `menus/`.

- [ ] `GET /menus/week?weekStartDate&studentId?` (scope school) → `WeeklyMenuDTO`
  (5 ngày × 3 bữa) + `allergyWarnings` (so `StudentAllergy` của bé) — P14 "dị ứng tôm".
- [ ] `POST/PATCH/DELETE /menus/items` (ADMIN/bếp 🌐 — `MENU_WRITE`).

**Done when:** P14 render thực đơn tuần + cảnh báo dị ứng đúng theo bé.

---

## API-H · Leave requests 🆕 — mock `leave-request` P15

**Trạng thái: 🔴 TODO** · Module mới `leave-requests/`.

- [ ] `POST /leave-requests` (PARENT) — con, loại, từ–đến, lý do, đính kèm (mediaId).
- [ ] `GET /leave-requests?studentId&status` (PARENT con mình / TEACHER lớp mình / NURSE).
- [ ] `POST /leave-requests/:id/review` (TEACHER/ADMIN — `LEAVE_REVIEW`): approve/reject + note.
- [ ] `POST /leave-requests/:id/cancel` (PARENT, khi PENDING).
- [ ] Side-effect: tạo → `Notification(LEAVE)` cho GV; review → notify PH. (Tuỳ chọn) approve
  → tạo `Attendance(EXCUSED)` cho các ngày nghỉ.

**Done when:** vòng đời PENDING→APPROVED/REJECTED hoạt động, có thông báo 2 chiều.

---

## API-I · Medicine — mock `medicine-list` M10, `create` M11, `detail` M12, `approve` T9

**Trạng thái: 🔴 TODO** · Module có sẵn `health/`.

- [ ] Giữ `GET /health/medicine-requests?studentId&status`,
  `POST /health/medicine-requests` (PARENT tạo — `MEDICINE_REQUEST_CREATE`).
- [ ] **Mới** `GET /health/medicine-requests/:id` → kèm `administrations[]` + timeline trạng
  thái (tạo→duyệt→cho uống, ai/khi nào) cho M12.
- [ ] **Mới** `POST .../:id/approve` (NURSE — `MEDICINE_APPROVE`) → APPROVED (T9 "Duyệt").
- [ ] **Mới** `POST .../:id/reject` (NURSE) → REJECTED + `rejectionReason` (T9 "Từ chối").
- [ ] **Mới** `POST .../:id/administer` (NURSE — `MEDICINE_ADMINISTER`) → tạo
  `MedicineAdministration` + set ADMINISTERED (M12 "Đã cho uống").
- [ ] Side-effect: mỗi chuyển trạng thái → `Notification(MEDICINE)` cho PH + `AuditLog`.

**Done when:** timeline M12 dựng từ data thật; reject bắt buộc lý do; PH không duyệt được.

---

## API-J · Finance + thanh toán online 🆕 — mock `invoices` M13, `payment-checkout` P13

**Trạng thái: 🔴 TODO** · Module có sẵn `finance/`.

- [ ] Giữ `GET /finance/invoices?studentId&status` (M13 tabs).
- [ ] **Mới** `GET /finance/invoices/:id` → kèm `lineItems[]` + `total` (P13 chi tiết khoản thu).
- [ ] **Mới** `POST /finance/payment-intents` (PARENT — `PAYMENT_INITIATE`):
  `{invoiceId, provider}` → tạo `PaymentIntent`, gọi cổng (VNPay/Momo), trả `redirectUrl`.
- [ ] **Mới** `GET /finance/payment-intents/:id` → poll trạng thái sau khi quay lại app.
- [ ] **Mới** `POST /finance/webhooks/:provider` (public, **verify chữ ký**): cập nhật
  `PaymentIntent`; nếu SUCCEEDED → tạo `Payment`, set invoice PAID, `Notification(INVOICE)`.
- [ ] Cron đánh dấu `OVERDUE` khi quá `dueDate` (M13 badge "Quá hạn").
- [ ] **Quyết định ⚪:** `invoices.html` (M13) chỉ "Liên hệ trường" còn `payment-checkout`
  (P13) là online → thêm flag bật/tắt online ở `School` 🌐. Mặc định mobile hiện nút checkout.

**Done when:** tạo intent → mở cổng → webhook → invoice PAID; idempotent theo
`(provider, providerRef)`.

---

## API-K · Announcements + Notifications — mock `feed` M14, `compose` M15, `notifications` M17

**Trạng thái: 🔴 TODO** · `announcements/` (có) + `notifications/` (mới).

- [ ] Announcements: thêm `coverMediaId`, `publishedAt` (lên lịch — M15); lọc theo
  audience/lớp + scope con.
- [ ] Notifications module: `GET /notifications?cursor`, `POST /notifications/read`,
  `POST /notifications/devices` (đăng ký Expo token), `DELETE .../devices/:id`.
- [ ] `NotificationService` (API-0) đẩy Expo push — giải quyết known-limitation "push chưa wired".

**Done when:** M17 feed có read/unread + deep-link; đăng ký/huỷ device token chạy.

---

## API-L · Messaging 🆕 — mock `chat-parent` T12, `chat-teacher` P16

**Trạng thái: 🔴 TODO** · Module mới `messaging/`.

- [ ] `GET /conversations` → list + `unreadCount` (tính từ `lastReadAt`) + đối phương +
  `lastMessage` (T12 inbox).
- [ ] `POST /conversations` (tạo/tìm DIRECT PH↔GV, idempotent theo cặp user + student).
- [ ] `GET /conversations/:id/messages?cursor` (P16, cursor pagination).
- [ ] `POST /conversations/:id/messages` (`body` và/hoặc `mediaId` — P16 gửi ảnh).
- [ ] `POST /conversations/:id/read` (cập nhật `lastReadAt`).
- [ ] Side-effect: tin mới → `Notification(MESSAGE)` + push. Scope: chỉ participant; PH chỉ
  chat GV của lớp con. 🌐 v2: WebSocket; v1 poll bằng TanStack Query.

**Done when:** PH↔GV nhắn được kèm ảnh; badge unread đúng; người ngoài không đọc được.

---

## API-M · Media upload — dùng ở M8/P15/P16/M14/M15

**Trạng thái: 🔴 TODO** · Module có sẵn `media/` (đang `NOT_IMPLEMENTED`).

- [ ] Hoàn thiện `presignUpload` (S3-compatible, dùng `S3_*` env) → `POST /media/presign`
  trả URL upload + `mediaId`; client upload trực tiếp; rồi gắn `mediaId` vào
  report/message/announcement/leave.
- [ ] Validate `mimeType`, `sizeBytes`; scope theo school/uploader.

**Done when:** upload 1 ảnh và hiển thị lại được trong report/chat.

---

## Definition of Done (Phase 3 — API)

- [ ] Mọi endpoint có `@Roles` + scope record-level (test cross-tenant: PH A ≠ đọc con PH B).
- [ ] Zod validate toàn bộ input; lỗi trả envelope chuẩn.
- [ ] `pnpm --filter @kimthanh/api build && lint` xanh.
- [ ] Seed đủ data để mobile render mọi màn (xem `01-database-schema.md` §Migration).
- [ ] (Khuyến nghị) unit test auth, RBAC, finance, medicine approve/administer.
</content>
