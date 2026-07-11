# KimThanh Kids — Vai trò & Quyền hạn (Roles & Permissions)

> **Đối tượng:** PO, chủ trường, đội phát triển, đào tạo người dùng.
> Tài liệu nhiều trang — mỗi vai trò một mục: **làm được gì · thao tác ra sao · không được gì**. Cuối tài liệu là **ma trận quyền** tổng hợp.
> Mọi mô tả khớp đúng phân quyền đang chạy trong API. Cập nhật: 2026-06.

---

## Mục lục
- [Tổng quan hệ vai trò](#tổng-quan)
- **Tầng nền tảng (KimThanh):** [Super Admin](#a1-super-admin) · [Billing](#a2-billing) · [Support](#a3-support)
- **Tầng trường:** [School Admin (Chủ trường)](#b1-school-admin) · [Principal (Hiệu trưởng)](#b2-principal) · [Teacher (Giáo viên)](#b3-teacher) · [Nurse (Y tá)](#b4-nurse) · [Finance (Kế toán)](#b5-finance) · [Parent (Phụ huynh)](#b6-parent)
- [Ma trận quyền tổng hợp](#ma-trận-quyền)
- [Quy tắc xuyên suốt](#quy-tắc-xuyên-suốt)

---

## Tổng quan

Có **2 nhóm vai trò** tách biệt hoàn toàn:

| Nhóm | Vai trò | Đăng nhập tại | Phạm vi |
|------|---------|---------------|---------|
| **Nền tảng** | Super Admin · Billing · Support | `admin.<tên-miền>` | Xuyên tất cả trường |
| **Trường** | School Admin · Principal · Teacher · Nurse · Finance · Parent | `<trường>.<tên-miền>` | Trong đúng 1 trường |

Trong một trường, **nhân sự (staff)** = School Admin + Principal + Teacher + Nurse + Finance. **Phụ huynh** đứng riêng (chỉ thấy dữ liệu con mình).

Một người có thể được gán **nhiều vai trò** (vd vừa Hiệu trưởng vừa dạy lớp). Quyền là **hợp** của các vai trò.

---

# TẦNG NỀN TẢNG (KimThanh)

## A1. Super Admin
**Là ai:** quản trị cao nhất của KimThanh (đội vận hành sản phẩm).

**Làm được gì & thao tác:**
- **Quản lý trường thuê:** xem danh sách/chi tiết trường; **khóa** (`suspend`) hoặc **mở lại** (`reactivate`) một trường.
- **Quản lý gói & thuê bao:** xem thuê bao, tạo/đánh dấu đã trả hóa đơn nền tảng; tạo & sửa gói cước.
- **Bật/tắt tính năng riêng cho 1 trường** (entitlement override) — phục vụ thỏa thuận đặc biệt ngoài gói.
- **Xem chỉ số vận hành:** `/platform/usage/overview` — số trường, người dùng hoạt động ngày/tuần/tháng (DAU/WAU/MAU), tính năng dùng nhiều.

**Không được:** truy cập dữ liệu nghiệp vụ nội bộ của trường (học sinh, báo cáo…) qua API thường — tách bạch để bảo mật khách hàng.

---

## A2. Billing
**Là ai:** nhân sự tài chính của KimThanh.

**Làm được gì:** **toàn bộ** nhóm quản lý thuê bao/hóa đơn/gói + chỉ số usage (cùng quyền với Super Admin trên các endpoint nền tảng — cả hai role đều được cấp).

**Khác Super Admin:** về mặt vận hành, Billing tập trung vào tiền (thuê bao, hóa đơn nền tảng); không nên dùng để khóa/mở trường dù kỹ thuật cho phép.

---

## A3. Support
**Là ai:** nhân sự CSKH của KimThanh.

**Hiện trạng:** vai trò đã định nghĩa nhưng **chưa được cấp endpoint nền tảng nào** (các API nền tảng hiện chỉ mở cho Super Admin + Billing). Support dùng cho giai đoạn sau (xem chi tiết trường ở chế độ chỉ đọc, hỗ trợ kỹ thuật). → **Điểm cần chốt với PO** nếu muốn kích hoạt sớm.

---

# TẦNG TRƯỜNG

## B1. School Admin (Chủ trường)
**Là ai:** chủ sở hữu / quản trị cao nhất của trường. Tài khoản đầu tiên tạo khi đăng ký.

**Làm được gì & thao tác:**
- **Cấu hình trường:** thương hiệu (logo/màu), thông tin ngân hàng + mã số thuế, các cơ sở (`schools`), tên miền.
- **Quản lý tài khoản:** tạo GV/Y tá/Kế toán/Hiệu trưởng/Phụ huynh (email **hoặc** SĐT); bật/tắt tài khoản.
- **Tổ chức:** tạo/sửa/xóa lớp; tạo/sửa/xóa học sinh + gán phụ huynh.
- **Vận hành:** điểm danh, báo cáo ngày, thông báo, giáo án, album (như giáo viên) — vì là staff đầy đủ quyền.
- **Sức khỏe:** ghi chỉ số, duyệt thuốc, ghi sự cố, quản lý dị ứng, duyệt đơn nghỉ.
- **Phân công nhân sự** theo lịch tuần.
- **Học phí:** lập/hủy hóa đơn, ghi nhận thanh toán, in chứng từ, xuất CSV.
- **Tự phục vụ billing:** xem gói/usage, đổi/hủy gói, trả hóa đơn nền tảng.
- **Giám sát:** xem **bảng tổng quan KPI** + **nhật ký hành động (audit log)**.

**Không được:** truy cập trường khác; xem console nền tảng.

---

## B2. Principal (Hiệu trưởng)
**Là ai:** điều hành chuyên môn, gần như ngang Chủ trường ở mảng vận hành.

**Làm được gì:** **giống School Admin** ở hầu hết nghiệp vụ trường: cấu hình trường, tạo tài khoản, quản lý lớp/học sinh, điểm danh/báo cáo, sức khỏe, phân công, học phí (lập/hủy/thu), thông báo/giáo án/album, dashboard, audit log.

**Khác School Admin:** không tham gia **tự phục vụ billing** (đổi gói/trả hóa đơn nền tảng) — mảng đó thuộc School Admin + Finance.

---

## B3. Teacher (Giáo viên)
**Là ai:** giáo viên đứng lớp.

**Làm được gì & thao tác:**
- **Lớp & học sinh:** xem lớp, xem & **sửa hồ sơ học sinh**, gán/bỏ phụ huynh (thuộc nhóm EDITORS).
- **Điểm danh** cả lớp; **soạn báo cáo hằng ngày** (gắn ảnh).
- **Thông báo:** soạn/đăng/xóa thông báo (toàn trường/PH/GV/lớp).
- **Giáo án tuần** (*cần gói có `lesson_plan`*) · **Album ảnh** (*cần `media_gallery`*).
- **Sức khỏe:** ghi chỉ số sức khỏe, **ghi nhận sự cố**, **xử lý đơn thuốc** (duyệt/đã uống), **duyệt đơn nghỉ**.
- Xem **lịch phân công của mình** (`/assignments/mine`).
- Nhận **thông báo cá nhân**.

**Không được:** tạo/xóa lớp; tạo tài khoản; cấu hình trường; **lập/hủy hóa đơn học phí**; xem dashboard KPI & audit log; phân công người khác.

---

## B4. Nurse (Y tá)
**Là ai:** phụ trách y tế trường.

**Làm được gì & thao tác:**
- **Hồ sơ sức khỏe:** ghi chiều cao/cân nặng/thân nhiệt → dữ liệu biểu đồ tăng trưởng.
- **Đơn thuốc:** xem danh sách, **duyệt/từ chối/đánh dấu đã cho uống** (có timeline).
- **Sự cố:** ghi nhận.
- **Dị ứng:** thêm/xóa (thuộc EDITORS của allergies) — phục vụ cảnh báo thực đơn.
- **Thực đơn tuần:** tạo/xóa (thuộc EDITORS của menus).
- Xem lớp, học sinh, điểm danh, báo cáo (chế độ xem của staff); lịch phân công của mình; thông báo cá nhân.

**Không được:** sửa hồ sơ học sinh; điểm danh/soạn báo cáo (thuộc giáo viên); lập hóa đơn; dashboard/audit; tạo tài khoản.

---

## B5. Finance (Kế toán)
**Là ai:** phụ trách thu học phí & chứng từ.

**Làm được gì & thao tác:**
- **Học phí:** lập hóa đơn, **hủy** hóa đơn (khi chưa thanh toán), **ghi nhận thanh toán tiền mặt**, xem danh sách, **in chứng từ**, **xuất CSV**.
- **Tự phục vụ billing trường** (cùng School Admin): xem gói/usage, đổi/hủy gói, trả hóa đơn nền tảng.
- Xem lớp/học sinh; nhận thông báo cá nhân.

**Không được:** sửa hồ sơ học sinh; điểm danh/báo cáo; sức khỏe; thông báo/giáo án/album; dashboard KPI & audit log (thuộc Admin/HT).

---

## B6. Parent (Phụ huynh)
**Là ai:** phụ huynh đại diện của học sinh (1 bé ~ 1 phụ huynh đại diện).

**Làm được gì & thao tác — chỉ với CON MÌNH:**
- Xem **danh sách con**, hồ sơ, **lịch sử điểm danh**, **báo cáo hằng ngày** + ảnh, **biểu đồ tăng trưởng**.
- **Gửi yêu cầu cho con uống thuốc**; theo dõi trạng thái xử lý.
- **Xin nghỉ học** cho con; theo dõi kết quả duyệt.
- Xem **thông báo** (toàn trường/PH + lớp con), **thực đơn tuần** + **cảnh báo dị ứng**, **album lớp con**.
- Xem **hóa đơn học phí của con**; lấy **mã VietQR** / khởi tạo thanh toán cổng; xem/in chứng từ.
- **Hộp thông báo cá nhân** + tự **bật/tắt loại thông báo**.

**Không được:** thấy dữ liệu bé khác/lớp khác; mọi thao tác quản trị; thông báo audience TEACHERS bị ẩn với phụ huynh.

---

## Ma trận quyền

> ✅ = làm được · 👁 = chỉ xem (của mình / con mình) · — = không có quyền · 🔒 = cần gói bật tính năng

| Chức năng | SAdmin | HT | GV | YT | KT | PH |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Cấu hình trường, cơ sở, tên miền | ✅ | ✅ | — | — | — | — |
| Tạo/bật-tắt tài khoản thành viên | ✅ | ✅ | — | — | — | — |
| Tạo/sửa/xóa lớp | ✅ | ✅ | — | — | — | — |
| Sửa hồ sơ học sinh, gán phụ huynh | ✅ | ✅ | ✅ | — | — | — |
| Xem học sinh | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 con |
| Điểm danh | ✅ | ✅ | ✅ | — | — | 👁 con |
| Báo cáo hằng ngày | ✅ | ✅ | ✅ | 👁 | 👁 | 👁 con |
| Ghi hồ sơ sức khỏe | ✅ | ✅ | ✅ | ✅ | — | 👁 con |
| Duyệt/ xử lý đơn thuốc | ✅ | ✅ | ✅ | ✅ | — | tạo + 👁 |
| Ghi sự cố | ✅ | ✅ | ✅ | ✅ | — | 👁 con |
| Quản lý dị ứng | ✅ | ✅ | — | ✅ | — | 👁 con |
| Đơn xin nghỉ | duyệt | duyệt | duyệt | 👁 | 👁 | tạo + 👁 |
| Phân công nhân sự | ✅ | ✅ | 👁 mình | 👁 mình | 👁 mình | — |
| Thông báo (soạn) | ✅ | ✅ | ✅ | 👁 | 👁 | 👁 |
| Thực đơn tuần | ✅ | ✅ | 👁 | ✅ | 👁 | 👁 |
| Giáo án 🔒 lesson_plan | ✅ | ✅ | ✅ | — | — | — |
| Album ảnh 🔒 media_gallery | ✅ | ✅ | ✅ | 👁 | — | 👁 con |
| Lập/hủy hóa đơn, thu học phí | ✅ | ✅ | — | — | ✅ | 👁 + trả |
| In chứng từ / xuất CSV | ✅ | ✅ | 👁 | 👁 | ✅ | 👁 con |
| Dashboard KPI | ✅ | ✅ | — | — | — | — |
| Nhật ký hành động (audit) | ✅ | ✅ | — | — | — | — |
| Tự phục vụ billing (gói trường) | ✅ | — | — | — | ✅ | — |
| Thông báo cá nhân (hộp thư) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Quy tắc xuyên suốt

1. **Cô lập trường:** không vai trò nào của trường này thấy dữ liệu trường khác.
2. **School-scope:** vai trò gắn cơ sở (vd GV/YT) chỉ thấy dữ liệu cơ sở đó; Admin/HT thấy toàn trường.
3. **Phụ huynh chỉ thấy con mình** — mọi truy vấn tự lọc theo quan hệ phụ huynh-học sinh.
4. **Tính năng theo gói:** Giáo án (Pro+), Album (Khởi đầu+). Hết gói/không có feature → bị chặn lịch sự (`FEATURE_NOT_AVAILABLE`).
5. **Hạn mức cứng:** vượt số học sinh/giáo viên của gói → bị chặn (`QUOTA_EXCEEDED`); phụ huynh giới hạn theo số học sinh. (Số lớp KHÔNG tính vào hạn mức gói.)
6. **Hành động nhạy cảm được ghi nhật ký:** tạo tài khoản, bật/tắt tài khoản, xóa học sinh, hủy/thu hóa đơn.
