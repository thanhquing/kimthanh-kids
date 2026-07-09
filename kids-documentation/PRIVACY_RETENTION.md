# Privacy · Data Classification · Retention · Incident Runbook

> Tài liệu KỸ THUẬT chốt chính sách dữ liệu cho KimThanh Kids. Các mốc retention là **quyết định v1 (default an toàn)**; con số liên quan kế toán/pháp lý (⚖️) nên được xác nhận với luật sư/kế toán trước khi bật job purge tự động. Nguồn tham chiếu cho §11 của [`SECURITY_AUDIT_CHECKLIST.md`](SECURITY_AUDIT_CHECKLIST.md).

## 1. Phân loại dữ liệu (data classification)

| Mức | Loại dữ liệu | Ví dụ model/field |
| --- | --- | --- |
| 🔴 **Nhạy cảm (đặc biệt)** | Sức khỏe & hình ảnh trẻ | `HealthRecord`, `Allergy`, `MedicineRequest`, `Incident`, `AlbumPhoto`/`DailyReportPhoto`, `Media` (ảnh trẻ) |
| 🟠 **PII** | Định danh trẻ & liên hệ | `Student.fullName/dateOfBirth/avatarUrl`, `User.email/phone/fullName` (PH & GV), `StudentParent` |
| 🟡 **Tài chính** | Chứng từ tiền | `TuitionInvoice`/`TuitionPayment`, `PlatformInvoice`/`PlatformPayment` |
| 🟢 **Vận hành** | Nghiệp vụ hằng ngày | `Attendance`, `DailyReport`, `Announcement`, `WeeklyMenu`, `LessonPlan`, `PickupLog` |
| ⚫ **Bí mật** | Không bao giờ lộ | `User.passwordHash` (đã hash), refresh/access token (chỉ hash lưu), `VNPAY_HASH_SECRET`/gateway secret (chỉ ở ENV) |

Nguyên tắc: dữ liệu 🔴/🟠 chỉ hiển thị trong phạm vi tenant + school-scope + đúng role; KHÔNG đưa vào title/body notification (xem §11 checklist — trước khi bật push FCM). KHÔNG log 🔴/⚫.

## 2. Chính sách retention

| Nhóm dữ liệu | Giữ trong | Sau đó | Cơ chế |
| --- | --- | --- | --- |
| Hồ sơ trẻ vận hành/sức khỏe (attendance, daily report, health, medicine, incident, allergy, album) | Khi còn học + **2 năm** sau khi rời trường | Hard-delete (cascade theo `Student`) | Job purge theo `Student.status=WITHDRAWN` + mốc thời gian |
| Chứng từ tài chính (tuition/platform invoice & payment) | ⚖️ **10 năm** (chuẩn lưu chứng từ kế toán VN) | Xem xét ẩn/lưu trữ lạnh | KHÔNG purge sớm |
| Media file vật lý (S3/đĩa) | Theo record `Media` | Xóa file khi record bị xóa | ⚠️ **Gap hiện tại**: xóa record chưa xóa file → cần cleanup job (xem §5) |
| Audit log | ⚖️ **≥ 12 tháng** (truy vết sự cố) | Lưu trữ lạnh/xóa | Job; audit KHÔNG chứa secret (chỉ id/action/actor) |
| Notification | **90 ngày** | Purge | Job (giảm phình DB) |
| Bản ghi soft-delete (`deletedAt != null`) | **30 ngày** grace (cho khôi phục) | Hard-delete vật lý | Job ops |

> Job purge/retention **chưa hiện thực** — thuộc pha ops/devops (nhóm D). Tài liệu này chốt CHÍNH SÁCH để khi có cron/ops thì thực thi theo đúng mốc.

## 3. Quyền được xóa (right-to-erasure)

- **Xóa 1 học sinh**: hard-delete `Student` → cascade toàn bộ bản ghi con (health/medicine/incident/allergy/attendance/daily report/tuition/pickup) theo `onDelete: Cascade`. Xem [`DATABASE_ERD.md` §Deletion contract](DATABASE_ERD.md). Regression: `test/deletion-contract.e2e-spec.ts`.
- **Xóa tài khoản PH/GV**: soft-delete (`deletedAt`) + `tokenVersion++` (thu hồi phiên); hard-delete chỉ khi không còn ràng buộc (RESTRICT bảo vệ).
- **Offboarding/xóa tenant toàn phần**: **quy trình ops tường minh, có audit** — KHÔNG phải một lệnh `DELETE` (FK `tenantId` RESTRICT chặn xóa nhầm dây chuyền). Thứ tự: export dữ liệu bàn giao (nếu cần) → purge con theo aggregate → xóa tenant.

## 4. Kiểm soát export & truy cập

- Export CSV học phí (`GET /tuition/invoices/export`) và bản in (`/invoices/:id/print`): role-gated (`@Roles` STAFF/VIEWERS) + school-scope; filter `status` validate enum (400 nếu sai — vòng 13).
- Platform impersonate tenant admin: có `AuditService.log` (truy vết ai truy cập tenant nào).
- Khuyến nghị (future): audit-log cho export khối lượng lớn dữ liệu trẻ/PH.

## 5. Incident runbook (rò rỉ / sự cố dữ liệu)

1. **Phát hiện** — cảnh báo (auth spike, brute-force, webhook fail, 5xx bất thường — nhóm D monitoring) hoặc báo cáo thủ công.
2. **Cô lập** — thu hồi phiên (`tokenVersion++` cho user/tenant nghi ngờ), suspend tenant nếu cần (`/platform/tenants/:id/suspend`), khóa key/secret bị lộ (xoay ENV).
3. **Đánh giá phạm vi** — dùng `AuditLog` xuyên tenant + log server xác định dữ liệu/đối tượng bị ảnh hưởng.
4. **Thông báo** — khách hàng (trường) bị ảnh hưởng; cơ quan chức năng nếu luật yêu cầu; giữ mốc thời gian.
5. **Khắc phục** — vá lỗ hổng, xoay secret, phát hành bản sửa.
6. **Postmortem** — nguyên nhân gốc, hành động phòng ngừa, cập nhật checklist bảo mật.

## 6. Còn mở (phụ thuộc ops/pháp lý)

- Xác nhận ⚖️ mốc retention tài chính/audit với kế toán/luật sư.
- Hiện thực job purge/cleanup (media file vật lý, soft-delete grace, notification 90 ngày) — pha ops/devops.
- Log redaction/masking ở prod cho PII/token/health/payment (nhóm D §12).
