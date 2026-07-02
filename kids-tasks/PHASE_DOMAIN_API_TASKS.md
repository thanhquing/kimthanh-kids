# Phase 1 — Tầng B: Domain nghiệp vụ (API — `kids-api`)

> ## ✅ Tiến độ (131 e2e / 15 suite ở inventory hiện tại · tsc + lint sạch ở mốc verify gần nhất)
> - **A — Nền:** `schoolWhere`/`assertSchoolAccess`/`isStaff` + `recordScopeWhere`/`ownedStudentWhere` (school-scope), tenant extension cô lập mọi model domain, quota `consumeQuota`/`releaseQuota`.
> - **B — Hồ sơ & tổ chức:** Students + Classrooms + Guardians (StudentParent): CRUD, gán phụ huynh, "con của tôi", quota STUDENTS/CLASSROOMS.
> - **C — Vận hành:** Attendance (điểm danh hàng loạt theo lớp, xem lớp/ngày, lịch sử con cho PH) + DailyReports (GV soạn upsert, xem lớp, feed con cho PH).
> - **Media (lưu nội bộ + nén):** `MediaService` dùng **sharp** — resize cạnh ≤ `MEDIA_MAX_DIM` (1280px), **webp** quality `MEDIA_QUALITY` (72, đủ cho PH xem), xoá metadata; lưu `MEDIA_ROOT/<tenantId>/<id>.webp`; quota `STORAGE_MB` (HARD); upload (staff) + serve (StreamableFile, cô lập theo tenant).
> - **D — Sức khỏe:** Health (y tá ghi chỉ số + API growth chiều cao/cân nặng) · Medicine (PH tạo → y tá duyệt/từ chối/đánh dấu đã uống, có `MedicineStatusHistory` timeline + ràng buộc chuyển trạng thái) · Incidents (staff ghi, PH xem con) + Allergies (unique studentId+allergen, cho cảnh báo thực đơn F3) · Leave (PH tạo → GV/admin duyệt 1 lần). Quyền xem dùng `recordScopeWhere`/`ownedStudentWhere`.
> - **B3 — Nhân sự:** tạo tài khoản trực tiếp (email/phone, login cả hai), đổi trạng thái (tắt → nhả quota), lịch phân công tuần (`StaffAssignment`); quota TEACHERS/ADMIN_USERS + PARENT theo STUDENTS.
> - **E — Học phí:** `TuitionInvoice`/`Item`/`Payment` (số HĐ tuần tự, line-items) · thanh toán **VietQR (tự sinh, miễn phí) + Tiền mặt + VNPay sandbox (webhook idempotent)** · **chứng từ in HTML** + xuất CSV + cấu hình bank/MST cho quyết toán thuế · cron `markOverdue`.
> - **F — Giao tiếp & nội dung:** Announcements (audience ALL/PARENTS/TEACHERS/CLASS, feed lọc theo người xem) · Weekly Menu + cảnh báo dị ứng theo `Allergy` · Lesson Plan (feature-gate `lesson_plan`) · Album ảnh (feature-gate `media_gallery`, dùng `Media`).
> - **G — Thông báo / dashboard / observability:** `Notification` in-app + `NotificationPreference` (bật/tắt theo loại) — feed cá nhân, phát từ 6 sự kiện (báo cáo ngày, announcement publish, sự cố, hóa đơn, duyệt thuốc, duyệt nghỉ); là chốt chặn duy nhất để gắn push FCM sau · `GET /dashboard/summary` KPI theo cơ sở (sĩ số, điểm danh hôm nay, thuốc/nghỉ chờ duyệt, công nợ, doanh thu tháng) · `AuditLog` ghi hành động nhạy cảm (member.create/activate/deactivate, student.delete, invoice.cancel/payment) + `GET /audit-logs` · `UsageEvent` nhẹ (track login) + `GET /platform/usage/overview` DAU/WAU/MAU cho operator. **Analytics nâng cao (G3) + Mixpanel/GA: KHÔNG làm (tự host đủ quản lý).**
> - **Seed demo:** `pnpm prisma:seed:demo` — 1 trường mẫu đầy đủ (gói PRO) để dev/demo UI. ✅
> - **Còn lại (đẩy sau theo trigger — đã thống nhất):** reset mật khẩu thật + email (P2), **push FCM** (làm cùng phase mobile — tái dùng `NotificationsService.notify` làm điểm phát), reconcile-counter (cuối P1), cổng MoMo/ZaloPay + đối soát VietQR tự động (P2), Analytics nâng cao G3/audit pipeline G5 (P2).
> - **Định danh & chống lạm dụng (đã làm 1 phần):** signup **bắt buộc MST** (`Tenant.taxCode` unique + checksum, 1 MST = 1 trường). **P2 còn lại:** xác minh MST live qua API thuế/ĐKKD (set `taxVerifiedAt`), SĐT OTP, gắn CCCD chủ, populate `School.moetCode` (mã Bộ GD&ĐT), hỗ trợ "chuỗi" (1 MST nhiều trường có duyệt).
> - **Kế tiếp:** API Phase 1 coi như đóng → `kids-platform`, `kids-crm` và `kids-mobile-web` đã tích hợp API thật cho các flow chính; `kids-mobile-native` đã scaffold/port copy-first. Push FCM làm trong phase mobile/release.

> **Chiến lược:** API-first toàn bộ. Làm **dứt điểm tất cả các phase API** (`kids-api`) trước; **UI/UX** tiêu thụ lại API đã ổn định (`kids-platform`/`kids-crm`/`kids-mobile-web` đã nối API thật; `kids-mobile-native` copy-first từ mobile-web). File này chỉ liệt kê **task API**.
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
- [x] **P1** Seed dữ liệu demo domain/platform — `prisma/seed-demo.ts` (`pnpm prisma:seed:demo`, idempotent theo slug `demo` + `saomai/bupmang/rangdong/tuoitho/banmai`): 1 trường gói **PRO** đủ tính năng, 3 lớp · 12 HS+PH · 6 nhân sự · điểm danh/báo cáo hôm nay · sức khỏe/thuốc/sự cố/nghỉ phép · thực đơn tuần (có cảnh báo dị ứng) · 2 thông báo · 12 hóa đơn (PAID/PARTIAL/UNPAID) · giáo án · album · thông báo in-app · usage login; thêm 5 tenant platform case để UI thấy đủ quota-risk, gói FREE/STARTER/PRO/ENTERPRISE, trial sắp hết hạn và công nợ cần thu. Đăng nhập demo domain: `admin@hoasen.edu.vn` / `Password123` tại host `demo.<ROOT_DOMAIN>`.

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

### B3. Staff/Teacher accounts — *mock: users, assignments, home-teacher* ✅ (reset mật khẩu thật → P2)
- [x] **Tạo tài khoản trực tiếp** (KHÔNG mời): `POST /tenant/members` — chủ trường/HT tạo GV/y tá/kế toán/PH; định danh **email HOẶC số điện thoại**, login bằng cả hai.
- [x] **Đổi trạng thái** (`PATCH /tenant/members/:id/status`): bật/tắt tài khoản — tắt chặn đăng nhập + giải phóng quota.
- [x] **Phân công làm việc** (`StaffAssignment`, lặp theo tuần: thứ + ca Sáng/Chiều/Cả ngày + lớp/nhiệm vụ): admin/HT `POST /assignments`; GV xem lịch `GET /assignments/mine`.
- [x] Quota enforce: `TEACHERS` (vai trò TEACHER), `ADMIN_USERS` (admin/HT/y tá/kế toán); **PARENT giới hạn theo `STUDENTS`** (1 HS ~ 1 PH). Gán lớp chủ nhiệm: qua `homeroomTeacherId` (classroom update).
- [ ] **P2** Reset mật khẩu thật + email (đẩy sau).

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

## E. Tài chính học phí (P0) — *mock: invoices, invoice-print, payments, payment-checkout* ✅

> KHÁC billing nền tảng (Phase 0). Đây là **trường → phụ huynh**.
- [x] Model `TuitionInvoice` (+ `TuitionInvoiceItem` line-items) — số hóa đơn tuần tự `HD-YYYY-NNNN`, status UNPAID/PARTIAL/PAID/OVERDUE/CANCELED, subtotal/discount/total/amountPaid.
- [x] Model `TuitionPayment` (method CASH/BANK_TRANSFER/VNPAY, status, reference, gatewayRef) + webhook idempotent (tái dùng pattern Phase 0).
- [x] **Phương thức (free, dễ ở VN):** **VietQR** (tự sinh EMVCo + CRC16, không phí, không cần cổng) · **Tiền mặt** (kế toán ghi nhận) · **VNPay sandbox** (tạo URL + IPN/webhook + đối soát).
- [x] API: kế toán/admin tạo/hủy + ghi nhận thanh toán; PH xem hóa đơn con + lấy VietQR/khởi tạo cổng. Cron `markOverdue`.
- [x] **Chứng từ in HTML** (`GET /tuition/invoices/:id/print`, raw HTML, in/xem online) + **xuất CSV** (`/export`) cho kế toán; TenantSettings thêm `taxCode/invoiceAddress/bank*` phục vụ quyết toán thuế.
- [ ] **P1/P2 (đẩy sau):** thêm cổng MoMo/ZaloPay (đã có lớp trừu tượng) · đối soát webhook ngân hàng tự động cho VietQR · báo cáo doanh thu (mục G analytics).

---

## F. Giao tiếp & nội dung (P0–P2)

### F1. Announcements — *mock: announcements, announcement-compose, announcements-feed* ✅
- [x] **P0** Model `Announcement` (audience ALL/PARENTS/TEACHERS/CLASS, classroomId?, publishedAt). Soạn theo phạm vi (`@Roles` GV/HT/admin); feed lọc theo người xem (PH chỉ thấy toàn trường/PH + lớp của con; TEACHERS ẩn với PH); nháp → publish. *(Notify đẩy sau cùng push.)*

### F3. Weekly Menu — *mock: menu-weekly* ✅
- [x] **P1** Model `WeeklyMenu` + `Meal` (weekday, mealType, name, ingredients) + **cảnh báo dị ứng** đối chiếu `Allergy` của học sinh (`GET /menus/:id/allergy-warnings`). PH xem thực đơn trường/lớp con.

### F4. Lesson Plan (`@RequireFeature('lesson_plan')`) — *mock: lesson-plan* ✅
- [x] **P2** Model `LessonPlan` + `Activity` (week, theme, activities[] day/time/title/materials). GV nội bộ, **feature-gate** (Free → 403 FEATURE_NOT_AVAILABLE, Pro+ dùng được).

### F5. Media/Album (`@RequireFeature('media_gallery')`) ✅
- [x] **P1** Model `Album` + `AlbumPhoto` (tái dùng `Media`); GV gắn ảnh đã upload, PH xem album lớp con. Feature-gate (Starter+).

---

## G. Thông báo, dashboard, audit (P1–P2) ✅ (trừ analytics nâng cao + admissions → P2)

- [x] **P1** `Notification` feed + `NotificationPreference` bật/tắt theo loại — *mock: notifications*. `NotificationsService.notify`/`notifyStudentParents` (@Global) phát từ 6 sự kiện: daily-report (tạo mới), announcement publish, incident, tuition invoice, medicine handle, leave decide. Mặc định bật; PH/GV tự tắt từng loại. **Là điểm phát duy nhất để gắn push FCM về sau.**
- [x] **P1** API dashboard tổng hợp KPI cho admin (`GET /dashboard/summary`, school-scope) — *mock: dashboard*. Sĩ số/lớp/nhân sự, điểm danh hôm nay theo trạng thái, thuốc + nghỉ chờ duyệt, công nợ (số HĐ + số tiền), doanh thu tháng.
- [x] **P1/P2** Ghi `AuditLog` cho hành động nhạy cảm + `GET /audit-logs` (admin xem, lọc theo action): `member.create`/`member.activate`/`member.deactivate`, `student.delete`, `invoice.cancel`, `invoice.payment`. `AuditService` (@Global, tái dùng model Phase 0).
- [x] **(thêm) Observability vận hành:** `UsageEvent` nhẹ (track `login`) + `GET /platform/usage/overview` (operator) → DAU/WAU/MAU + top event. Thay cho Mixpanel/GA: tự host, đủ để quản lý.
- [ ] **P2** Analytics (`@RequireFeature('analytics')`): xu hướng điểm danh, tăng trưởng, doanh thu — **chưa làm** (tách khi cần bán theo gói).
- [ ] **P2** Tuyển sinh/ghi danh (admissions pipeline) — ngoài mock, cân nhắc.

---

## Thứ tự triển khai (API)

1. **A** (nền) → **B** (hồ sơ/lớp) → **C** (điểm danh/báo cáo) — lõi vận hành.
2. **D** (sức khỏe + leave) → **E** (học phí) — nghiệp vụ + doanh thu.
3. **F** (giao tiếp/menu/album) → **G** (notification/dashboard/analytics).

> Khi bắt đầu mỗi module: cân nhắc dùng agent thiết kế schema chi tiết trước (như Phase 0), rồi mới code + test.

---

## Sau khi HOÀN TẤT toàn bộ API → mới sang UI/UX

Phase UI/UX (file task riêng): **kids-platform**, **kids-crm**, **kids-mobile-web**, **kids-mobile-native** — tiêu thụ API Tầng A + B, áp white-label (logo/màu từ `/public/branding`). Trạng thái chi tiết xem [`PHASE_UI_TASKS.md`](./PHASE_UI_TASKS.md).
