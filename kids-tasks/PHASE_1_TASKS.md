# Phase 1 — Tầng B: Domain nghiệp vụ (kids-api)

> **Tiền đề:** Phase 0 (Tầng A — nền tảng SaaS) đã xong. Mọi bảng domain dưới đây **BẮT BUỘC** có `tenantId` (non-null) + `schoolId`, và thêm tên model vào `TENANT_KEY` trong [`prisma-tenant.extension.ts`](../kids-api/src/prisma/prisma-tenant.extension.ts) để tự cô lập.
>
> **Quy ước chung mỗi module:** Prisma model(s) → migration → service (dùng `prisma.db`) → controller (`@Roles` + scope theo `allowedSchoolIds`) → Zod DTO → e2e test cô lập. Tích hợp **quota** (`EntitlementService.consumeQuota`) khi tạo thực thể tính phí, và **feature-gating** (`@RequireFeature`) cho tính năng theo gói.
>
> Nguồn UI: `kids-landing/public/mock-ui/` (web admin + mobile). Mức ưu tiên: **P0** = bắt buộc cho bản chạy thật đầu tiên · **P1** = quan trọng · **P2** = nâng cao/sau.

---

## A. Nền domain dùng chung (làm trước)

- [ ] **P0** Thêm helper scope theo school: guard/decorator `@SchoolScope` đọc `allowedSchoolIds` từ `AuthUser`; service kiểm tra resource `schoolId ∈ allowedSchoolIds` (null = toàn tenant).
- [ ] **P0** Cập nhật `TENANT_KEY` + `SOFT_DELETE` trong tenant extension cho mọi model mới.
- [ ] **P0** Tích hợp `consumeQuota`/`releaseQuota` vào create/delete của Student, Teacher(member), Classroom; reconcile job đếm lại counter.
- [ ] **P1** Lưu trữ media: tích hợp object storage (Cloudflare R2 / S3) + signed upload URL; model `Media` + liên kết.
- [ ] **P1** Push notification: tích hợp FCM/Expo; model `Notification` + `DeviceToken` + service fan-out.
- [ ] **P1** Seed dữ liệu demo domain (1 trường: lớp, học sinh, phụ huynh, giáo viên) để CRM/mobile dev.

---

## B. Hồ sơ & tổ chức (P0)

### B1. Students & Guardians — *mock: students, student-profile, children-list, student-detail*
- [ ] Model `Student` (fullName, nickname, dob, gender, avatarUrl, classroomId, schoolId, tenantId, status, soft-delete).
- [ ] Model `Guardian`/`StudentParent` (quan hệ N-N học sinh ↔ phụ huynh; relationship Mẹ/Ba; isPrimary).
- [ ] API: CRUD học sinh (admin/teacher), gán phụ huynh, xuất CSV; phụ huynh xem con mình (`children-list`).
- [ ] Quota: `consumeQuota(STUDENTS)` khi thêm học sinh.

### B2. Classrooms & enrollment — *mock: classrooms, classroom-detail, class-roster*
- [ ] Model `Classroom` (name, ageGroup, capacity, homeroomTeacherId, schoolId).
- [ ] Enrollment học sinh ↔ lớp; sĩ số; danh sách lớp (`class-roster`).
- [ ] Quota: `CLASSROOMS`.

### B3. Staff/Teacher accounts (gap) — *mock: users; thiếu màn tạo GV trên mobile*
- [ ] Hoàn thiện luồng mời GV/y tá/kế toán (đã có `/tenant/members/invite` ở Phase 0) → thêm gán lớp chủ nhiệm, reset mật khẩu thật, đổi trạng thái.
- [ ] Quota: `TEACHERS`, `ADMIN_USERS`.

---

## C. Vận hành hằng ngày (P0)

### C1. Attendance — *mock: attendance, attendance-mark, attendance-history*
- [ ] Model `Attendance` (studentId, classroomId, date, status PRESENT/LATE/ABSENT/EXCUSED, checkInAt, note, recordedById). Unique (studentId, date).
- [ ] API: GV điểm danh hàng loạt theo lớp; phụ huynh xem lịch sử + calendar.

### C2. Daily Reports — *mock: report-compose (GV) → report-feed (PH)*
- [ ] Model `DailyReport` (studentId, date, mood, meals, nap, activities, note, authorId, images[]). Unique (studentId, date).
- [ ] API: GV soạn (hỗ trợ soạn hàng loạt/lớp); PH xem timeline theo con; gắn ảnh (media).
- [ ] Notification khi có báo cáo mới.

---

## D. Sức khỏe (P0–P1)

### D1. Health records — *mock: health-records*
- [ ] **P0** Model `HealthRecord` (heightCm, weightKg, temperatureC, date, recordedById) — y tá ghi.
- [ ] **P1** Theo dõi tăng trưởng (gap): biểu đồ chiều cao/cân nặng theo thời gian (analytics).

### D2. Medicine requests — *mock: medicine-list/create/detail (PH) → medicine-approve (GV/NURSE)*
- [ ] **P0** Model `MedicineRequest` (medicineName, dosage, schedule, startDate, endDate, reason, status PENDING/APPROVED/ADMINISTERED/REJECTED, handledById).
- [ ] **P0** Model `MedicineStatusHistory` (gap): timeline đổi trạng thái + ghi chú y tá.
- [ ] API: PH tạo/track; y tá duyệt/từ chối/đánh dấu đã cho uống.

### D3. Incidents & Allergies — *mock: incidents*
- [ ] **P1** Model `Incident` (date, type, severity LOW/MEDIUM/HIGH, description, actionTaken, reportedById) + notify PH.
- [ ] **P1** Model `Allergy` (studentId, allergen) — dùng cảnh báo trong thực đơn.

### D4. Leave requests (gap) — *mock: leave-request (PH); thiếu màn GV duyệt*
- [ ] **P0** Model `LeaveRequest` (studentId, leaveType SICK/FAMILY/OTHER, dates, reason, attachmentUrl, status PENDING/APPROVED/REJECTED).
- [ ] **P0** API: PH tạo; **GV/admin duyệt** (bổ sung màn còn thiếu).

---

## E. Tài chính học phí (P0) — *mock: invoices, payments, payment-checkout*

> KHÁC billing nền tảng (Phase 0). Đây là **trường → phụ huynh**.
- [ ] Model `TuitionInvoice` (studentId, period, items[], amount, dueDate, status UNPAID/PAID/OVERDUE, schoolId).
- [ ] Model `TuitionPayment` (invoiceId, amount, method, reference) + cổng thanh toán **VNPay/Momo** cho phụ huynh.
- [ ] API: kế toán tạo/quản lý hóa đơn, xuất báo cáo; PH xem + thanh toán online; webhook reconcile.
- [ ] **Thống nhất** (Tầng C): online (mobile) vs "liên hệ trường" (web) → chọn một luồng.

---

## F. Giao tiếp & nội dung (P0–P1)

### F1. Announcements — *mock: announcements (web), announcement-compose/announcements-feed (mobile)*
- [ ] **P0** Model `Announcement` (title, body, audience ALL/PARENTS/TEACHERS/CLASS, classroomId?, publishedAt, authorId).
- [ ] API: admin/GV soạn theo phạm vi; PH xem feed; notify.

### F2. Chat/Messaging (`@RequireFeature('messaging')`) — *mock: chat-parent, chat-teacher*
- [ ] **P1** Model `Conversation` + `Message` (1-1 GV↔PH; cân nhắc nhóm lớp). Realtime qua WebSocket/SSE.
- [ ] Quyết định (Tầng C): nhóm cả lớp vs 1-1; ai khởi tạo.

### F3. Weekly Menu (`@RequireFeature`?) — *mock: menu-weekly*
- [ ] **P1** Model `WeeklyMenu` + `Meal` (date, mealType BREAKFAST/LUNCH/SNACK, name, calories, nutritionTags) + cảnh báo dị ứng theo `Allergy`.

### F4. Lesson Plan (`@RequireFeature('lesson_plan')`) — *mock: lesson-plan*
- [ ] **P2** Model `LessonPlan` + `Activity` (week, theme, activities[] với time/title/materials). GV nội bộ.

### F5. Media/Album (gap, `@RequireFeature('media_gallery')`) — *ảnh "coming soon" trong mock*
- [ ] **P1** Album ảnh lớp cho PH xem (gắn với DailyReport/Classroom) — tính năng gắn kết mạnh; dùng object storage ở mục A.

---

## G. Thông báo, dashboard, audit (P1–P2)

- [ ] **P1** `Notification` feed + cấu hình bật/tắt theo loại (attendance/report/announcement/invoice) — *mock: notifications*.
- [ ] **P1** Dashboard tổng hợp KPI cho admin (sĩ số, điểm danh, hóa đơn, yêu cầu thuốc) — *mock: dashboard*.
- [ ] **P2** Analytics nâng cao (`@RequireFeature('analytics')`): xu hướng điểm danh, tăng trưởng, doanh thu.
- [ ] **P2** Ghi `AuditLog` cho hành động nhạy cảm (sửa hóa đơn, xóa học sinh, đổi quyền).
- [ ] **P2** Tuyển sinh/ghi danh (admissions pipeline) — ngoài mock, cân nhắc.

---

## H. Tích hợp UI (sau khi API ổn định)

- [ ] **kids-crm**: web quản trị tiêu thụ API (auth theo subdomain, load branding, các module B–G).
- [ ] **kids-mobile-native / kids-mobile-web**: app phụ huynh/giáo viên.
- [ ] Áp white-label (logo/màu từ `/public/branding`) vào CRM + mobile.

---

## Thứ tự đề xuất

1. **A** (nền) → **B** (hồ sơ/lớp) → **C** (điểm danh/báo cáo) — lõi vận hành.
2. **D** (sức khỏe + leave) → **E** (học phí) — giá trị nghiệp vụ + doanh thu.
3. **F** (giao tiếp/menu/album) → **G** (notification/dashboard).
4. **H** (UI) song song khi API từng module ổn định.

> Khi bắt đầu mỗi module: cân nhắc dùng workflow/agent để thiết kế schema chi tiết trước (như Phase 0), rồi mới code.
