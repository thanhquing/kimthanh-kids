# Phase 1 — Tầng B: Domain nghiệp vụ (API — `kids-api`)

> ## ✅ Tiến độ (74 e2e pass / 9 suite · tsc + lint sạch)
> - **A — Nền:** `schoolWhere`/`assertSchoolAccess`/`isStaff` + `recordScopeWhere`/`ownedStudentWhere` (school-scope), tenant extension cô lập mọi model domain, quota `consumeQuota`/`releaseQuota`.
> - **B — Hồ sơ & tổ chức:** Students + Classrooms + Guardians (StudentParent): CRUD, gán phụ huynh, "con của tôi", quota STUDENTS/CLASSROOMS.
> - **C — Vận hành:** Attendance (điểm danh hàng loạt theo lớp, xem lớp/ngày, lịch sử con cho PH) + DailyReports (GV soạn upsert, xem lớp, feed con cho PH).
> - **Media (lưu nội bộ + nén):** `MediaService` dùng **sharp** — resize cạnh ≤ `MEDIA_MAX_DIM` (1280px), **webp** quality `MEDIA_QUALITY` (72, đủ cho PH xem), xoá metadata; lưu `MEDIA_ROOT/<tenantId>/<id>.webp`; quota `STORAGE_MB` (HARD); upload (staff) + serve (StreamableFile, cô lập theo tenant).
> - **D — Sức khỏe:** Health (y tá ghi chỉ số + API growth chiều cao/cân nặng) · Medicine (PH tạo → y tá duyệt/từ chối/đánh dấu đã uống, có `MedicineStatusHistory` timeline + ràng buộc chuyển trạng thái) · Incidents (staff ghi, PH xem con) + Allergies (unique studentId+allergen, cho cảnh báo thực đơn F3) · Leave (PH tạo → GV/admin duyệt 1 lần). Quyền xem dùng `recordScopeWhere`/`ownedStudentWhere`.
> - **Còn lại (đẩy sau theo trigger — đã thống nhất):** export CSV (cuối P1), reset mật khẩu thật + email (P2), push FCM + notify incidents/leave (cuối P1/P2), seed demo + reconcile-counter (cuối P1).
> - **Kế tiếp:** E (Tài chính học phí: TuitionInvoice + TuitionPayment + cổng VNPay/Momo).

> **Chiến lược:** API-first toàn bộ. Làm **dứt điểm tất cả các phase API** (`kids-api`) trước; **UI/UX** (kids-crm, kids-mobile-native, kids-mobile-web) là **phase riêng SAU CÙNG**, tiêu thụ lại API đã ổn định. File này chỉ liệt kê **task API**.
>
> **Tiền đề:** Phase 0 (Tầng A — nền tảng SaaS) đã xong. Mọi bảng domain dưới đây **BẮT BUỘC** có `tenantId` (non-null) + `schoolId`, và thêm tên model vào `TENANT_KEY` trong [`prisma-tenant.extension.ts`](../kids-api/src/prisma/prisma-tenant.extension.ts) để tự cô lập.
>
> **Quy ước mỗi module:** Prisma model(s) → migration → service (dùng `prisma.db`) → controller (`@Roles` + scope theo `allowedSchoolIds`) → Zod DTO → e2e test cô lập. Tích hợp **quota** (`EntitlementService.consumeQuota`) khi tạo thực thể tính phí, và **feature-gating** (`@RequireFeature`) cho tính năng theo gói.
>
> Nguồn UI tham chiếu: `kids-landing/public/mock-ui/`. Ưu tiên: **P0** = bắt buộc cho bản chạy thật đầu · **P1** = quan trọng · **P2** = nâng cao/sau.

---

## A. Nền domain dùng chung (làm trước)

- [ ] **P0** Guard/decorator `@SchoolScope`: đọc `allowedSchoolIds` từ `AuthUser`; service kiểm tra resource `schoolId ∈ allowedSchoolIds` (null = toàn tenant).
- [ ] **P0** Cập nhật `TENANT_KEY` + `SOFT_DELETE` trong tenant extension cho mọi model mới.
- [ ] **P0** Tích hợp `consumeQuota`/`releaseQuota` vào create/delete của Student, Teacher(member), Classroom; reconcile job đếm lại counter.
- [ ] **P1** Lưu trữ media: object storage (Cloudflare R2 / S3) + signed upload URL; model `Media` + liên kết.
- [ ] **P1** Push notification: tích hợp FCM/Expo; model `Notification` + `DeviceToken` + service fan-out.
- [ ] **P1** Seed dữ liệu demo domain (1 trường: lớp, học sinh, phụ huynh, giáo viên).

---

## B. Hồ sơ & tổ chức (P0)

### B1. Students & Guardians — *mock: students, student-profile, children-list, student-detail*
- [ ] Model `Student` (fullName, nickname, dob, gender, avatarUrl, classroomId, schoolId, tenantId, status, soft-delete).
- [ ] Model `StudentParent` (N-N học sinh ↔ phụ huynh; relationship Mẹ/Ba; isPrimary).
- [ ] API: CRUD học sinh, gán phụ huynh, xuất CSV; phụ huynh xem con mình.
- [ ] Quota: `consumeQuota(STUDENTS)`.

### B2. Classrooms & enrollment — *mock: classrooms, classroom-detail, class-roster*
- [ ] Model `Classroom` (name, ageGroup, capacity, homeroomTeacherId, schoolId) + enrollment + sĩ số.
- [ ] Quota: `CLASSROOMS`.

### B3. Staff/Teacher accounts (gap) — *mock: users*
- [ ] Hoàn thiện luồng mời GV/y tá/kế toán (đã có `/tenant/members/invite` ở Phase 0): gán lớp chủ nhiệm, reset mật khẩu thật, đổi trạng thái.
- [ ] Quota: `TEACHERS`, `ADMIN_USERS`.

---

## C. Vận hành hằng ngày (P0)

### C1. Attendance — *mock: attendance, attendance-mark, attendance-history*
- [ ] Model `Attendance` (studentId, classroomId, date, status PRESENT/LATE/ABSENT/EXCUSED, checkInAt, note, recordedById). Unique (studentId, date).
- [ ] API: GV điểm danh hàng loạt theo lớp; phụ huynh xem lịch sử + calendar.

### C2. Daily Reports — *mock: report-compose (GV) → report-feed (PH)*
- [ ] Model `DailyReport` (studentId, date, mood, meals, nap, activities, note, authorId, images[]). Unique (studentId, date).
- [ ] API: GV soạn (hỗ trợ hàng loạt/lớp); PH xem timeline theo con; gắn ảnh. Notify khi có báo cáo mới.

---

## D. Sức khỏe (P0–P1)

### D1. Health records — *mock: health-records* ✅
- [x] **P0** Model `HealthRecord` (heightCm, weightKg, temperatureC, date, recordedById) — y tá ghi.
- [x] **P1** API tăng trưởng (gap): dữ liệu biểu đồ chiều cao/cân nặng theo thời gian (`GET /health/student/:id/growth`).

### D2. Medicine requests — *mock: medicine-list/create/detail (PH) → medicine-approve (GV/NURSE)* ✅
- [x] **P0** Model `MedicineRequest` (medicineName, dosage, schedule, startDate, endDate, reason, status PENDING/APPROVED/ADMINISTERED/REJECTED, handledById).
- [x] **P0** Model `MedicineStatusHistory` (gap): timeline đổi trạng thái + ghi chú y tá.
- [x] API: PH tạo/track (`/mine`); y tá duyệt/từ chối/đánh dấu đã cho uống (`/:id/handle`, ràng buộc ADMINISTERED phải sau APPROVED).

### D3. Incidents & Allergies — *mock: incidents* ✅
- [x] **P1** Model `Incident` (date, type, severity LOW/MEDIUM/HIGH, description, actionTaken, reportedById). *(notify PH đẩy sau cùng push FCM.)*
- [x] **P1** Model `Allergy` (studentId, allergen, unique) — dùng cảnh báo thực đơn (F3).

### D4. Leave requests (gap) — *mock: leave-request (PH); thiếu màn GV duyệt* ✅
- [x] **P0** Model `LeaveRequest` (studentId, leaveType SICK/FAMILY/OTHER, dates, reason, attachmentUrl, status PENDING/APPROVED/REJECTED).
- [x] **P0** API: PH tạo (`/mine`); **GV/admin duyệt** (`/:id/decide`, chỉ xử lý 1 lần khi PENDING).

---

## E. Tài chính học phí (P0) — *mock: invoices, payments, payment-checkout*

> KHÁC billing nền tảng (Phase 0). Đây là **trường → phụ huynh**.
- [ ] Model `TuitionInvoice` (studentId, period, items[], amount, dueDate, status UNPAID/PAID/OVERDUE, schoolId).
- [ ] Model `TuitionPayment` (invoiceId, amount, method, reference) + cổng **VNPay/Momo** cho phụ huynh + webhook reconcile (tái dùng pattern Phase 0).
- [ ] API: kế toán tạo/quản lý + báo cáo; PH xem + thanh toán online.
- [ ] **Thống nhất** luồng: online (mobile) vs "liên hệ trường" (web) → chọn một.

---

## F. Giao tiếp & nội dung (P0–P2)

### F1. Announcements — *mock: announcements, announcement-compose, announcements-feed*
- [ ] **P0** Model `Announcement` (title, body, audience ALL/PARENTS/TEACHERS/CLASS, classroomId?, publishedAt, authorId). API soạn theo phạm vi + notify.

### F2. Chat/Messaging (`@RequireFeature('messaging')`) — *mock: chat-parent, chat-teacher*
- [ ] **P1** Model `Conversation` + `Message` (1-1 GV↔PH; cân nhắc nhóm lớp). Realtime WebSocket/SSE.
- [ ] Quyết định: nhóm cả lớp vs 1-1; ai khởi tạo.

### F3. Weekly Menu — *mock: menu-weekly*
- [ ] **P1** Model `WeeklyMenu` + `Meal` (date, mealType, name, calories, nutritionTags) + cảnh báo dị ứng theo `Allergy`.

### F4. Lesson Plan (`@RequireFeature('lesson_plan')`) — *mock: lesson-plan*
- [ ] **P2** Model `LessonPlan` + `Activity` (week, theme, activities[] time/title/materials). GV nội bộ.

### F5. Media/Album (gap, `@RequireFeature('media_gallery')`)
- [ ] **P1** API album ảnh lớp cho PH xem (gắn DailyReport/Classroom) — dùng object storage ở mục A.

---

## G. Thông báo, dashboard, audit (P1–P2)

- [ ] **P1** `Notification` feed + cấu hình bật/tắt theo loại (attendance/report/announcement/invoice) — *mock: notifications*.
- [ ] **P1** API dashboard tổng hợp KPI cho admin — *mock: dashboard*.
- [ ] **P2** Analytics (`@RequireFeature('analytics')`): xu hướng điểm danh, tăng trưởng, doanh thu.
- [ ] **P2** Ghi `AuditLog` cho hành động nhạy cảm (sửa hóa đơn, xóa học sinh, đổi quyền).
- [ ] **P2** Tuyển sinh/ghi danh (admissions pipeline) — ngoài mock, cân nhắc.

---

## Thứ tự triển khai (API)

1. **A** (nền) → **B** (hồ sơ/lớp) → **C** (điểm danh/báo cáo) — lõi vận hành.
2. **D** (sức khỏe + leave) → **E** (học phí) — nghiệp vụ + doanh thu.
3. **F** (giao tiếp/menu/album) → **G** (notification/dashboard/analytics).

> Khi bắt đầu mỗi module: cân nhắc dùng agent thiết kế schema chi tiết trước (như Phase 0), rồi mới code + test.

---

## Sau khi HOÀN TẤT toàn bộ API → mới sang UI/UX

Phase UI/UX (file task riêng, làm sau): **kids-crm** (web quản trị), **kids-mobile-native**, **kids-mobile-web** — tiêu thụ API Tầng A + B, áp white-label (logo/màu từ `/public/branding`). KHÔNG bắt đầu khi API chưa ổn định.
