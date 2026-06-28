# kids-mobile-web — Kịch bản chức năng (cơ sở cho E2E test FE)

> Liệt kê **chi tiết từng chức năng** (xem/list, thêm, sửa, xoá, hành động, lọc, trạng thái UI) theo từng module sau khi đã integrate API thật. Dùng làm scenario cho Playwright/Cypress sau này. Mỗi mục: **route · role · thao tác · API · trạng thái UI · kịch bản kỳ vọng**.

## Quy ước chung (áp dụng mọi màn)

- **Trạng thái UI 3 nhánh** mọi danh sách/chi tiết: `loading` (skeleton/"Đang tải dữ liệu…"), `error` (card đỏ), `empty` (card xám). E2E phải cover cả 3.
- **i18n**: mọi nhãn qua `t()` — test cả VI và EN (toggle ở Login + Profile). Đổi ngôn ngữ → toàn bộ chuỗi đổi tức thì, `x-language` header đổi theo.
- **Auth**: chưa login → mọi route `/parent/*` `/teacher/*` redirect `/login`. Sai role khu vực → redirect về home đúng role (RoleGuard).
- **Tài khoản test** (host `demo.kimthanhkids.vn`, mật khẩu `Password123`): PH `0901000001..0901000012`; GV `0909000010` (co.mai), `0909000011` (co.lan).

---

## 1. Auth

| Chức năng | Route | Role | Thao tác | API | Kịch bản E2E |
|---|---|---|---|---|---|
| Đăng nhập | `/login` | công khai | nhập SĐT + mật khẩu → submit | `POST /auth/login` → `GET /auth/me` | (a) đúng PH → vào `/parent`; (b) đúng GV → vào `/teacher`; (c) sai mật khẩu → lỗi "SĐT/mật khẩu không đúng"; (d) tài khoản role khác (admin) → "không dùng được trên app"; (e) loading nút "Đang đăng nhập…" |
| Đổi ngôn ngữ trước login | `/login`, `/reset-password` | công khai | bấm VI/EN | — | toàn màn đổi ngôn ngữ; lựa chọn lưu `kk_mw_lang` |
| Quên mật khẩu | `/reset-password` | công khai | xem hướng dẫn | — (defer) | hiển thị "liên hệ nhà trường" + hotline; nút quay lại `/login` |
| Đăng xuất | ProfilePage | PH/GV | bấm Đăng xuất | `POST /auth/logout` | clear token → về `/login`; vào lại route cũ → redirect `/login` |
| Guard role khi reload sâu | `/teacher/*` bằng tài khoản PH | — | reload URL | `GET /auth/me` | PH mở `/teacher/x` → redirect `/parent`; ngược lại GV mở `/parent/x` → `/teacher` |

## 2. Students / Children

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Liệt kê con | `/parent/children` | PH | xem danh sách | `GET /students/mine` | hiện đủ con (tên, lớp, tuổi); rỗng → "chưa có học sinh"; bấm 1 bé → `/parent/student/:id` |
| Chi tiết bé (PH) | `/parent/student/:id` | PH | xem | lấy từ `/students/mine` | hiện hồ sơ + điểm danh gần nhất + người giám hộ; KHÔNG có khối sức khỏe |
| Chi tiết bé (GV) | `/teacher/student/:id` | GV | xem | `GET /students/:id` + `/attendance/student/:id` + `/allergies/student/:id` + `/incidents/student/:id` | thêm khối "Cảnh báo sức khỏe" (dị ứng + số sự cố) |
| Sĩ số lớp | `/teacher/class` | GV | xem + đổi lớp | `GET /classrooms` + `GET /students?classroomId=` | KPI tổng/đang học/cần rà soát; chip chọn lớp; bấm bé → detail |

## 3. Attendance

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Điểm danh | `/teacher/attendance` | GV | chọn ngày + lớp, set trạng thái từng bé (Có mặt/Muộn/Vắng/Phép), ghi chú, Lưu | `GET /attendance?classroomId=&date=` → `POST /attendance/mark` | load trạng thái cũ nếu đã điểm danh; lưu → toast "Đã lưu cho N bé"; đổi ngày → reload; ghi chú qua bottom sheet |
| Lịch sử điểm danh | `/teacher/attendance/history` | GV | xem 5 ngày gần nhất | `GET /attendance` ×5 ngày (useQueries) | tỉ lệ đi học %; mỗi ngày: present/total + badge từng bé; ngày chưa điểm danh → "Chưa điểm danh" |
| PH xem điểm danh con | trong StudentDetail | PH | xem | `GET /attendance/student/:id` | record gần nhất + ghi chú |

## 4. Daily Reports

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Soạn/sửa báo cáo | `/teacher/reports/new` | GV | chọn ngày/lớp/bé, tâm trạng, bữa ăn/ngủ/hoạt động/nhận xét, Gửi | `GET /daily-reports?classroomId=&date=` → `POST /daily-reports` (upsert) | nếu đã có báo cáo cho bé/ngày → form prefill; gửi → toast; "Thêm ảnh" disabled (chưa làm) |
| Feed báo cáo (PH) | `/parent/reports` | PH | xem theo bé | `GET /daily-reports/student/:id` | bé lấy từ `selectedStudentId` (set khi mở detail) hoặc con đầu; rỗng → "chưa có báo cáo" |

## 5. Medicine + Health

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Liệt kê thuốc | `/{role}/medicine` | PH/GV | lọc trạng thái | PH `GET /medicine/mine` · GV `GET /medicine?status=` | PH lọc client, GV lọc server; PH có nút (+) tạo; GV có nút "Duyệt yêu cầu chờ" |
| Tạo yêu cầu thuốc | `/parent/medicine/new` | PH | chọn bé, tên thuốc, liều, lịch, từ/đến ngày, ghi chú → Gửi | `POST /medicine` | validate bắt buộc tên/liều/lịch; gửi → invalidate list parent → toast |
| Chi tiết yêu cầu | `/{role}/medicine/:id` | PH/GV | xem + (GV) duyệt/từ chối/cho uống | `GET /medicine/:id` · `POST /medicine/:id/handle` | history timeline; GV thấy nút theo trạng thái: PENDING→Duyệt/Từ chối; APPROVED→Đánh dấu đã cho uống; PH chỉ xem |
| Duyệt thuốc | `/teacher/medicine/approve` | GV | duyệt nhanh / từ chối (kèm lý do) | `GET /medicine?status=PENDING` · `POST /medicine/:id/handle` | chỉ list PENDING; duyệt → toast + biến mất khỏi list; từ chối mở bottom sheet nhập lý do |
| Cảnh báo sức khỏe | StudentDetail (GV) | GV | xem dị ứng + sự cố | `GET /allergies/student/:id` · `GET /incidents/student/:id` | rỗng → "Chưa ghi nhận"/"Không có sự cố" |

## 6. Tuition

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Liệt kê hóa đơn | `/parent/invoices` | PH | lọc Chưa TT/Đã TT/Tất cả | `GET /tuition/invoices/mine` | badge số "chưa thanh toán"; mỗi HĐ: kỳ, số HĐ, còn lại, hạn; nút Thanh toán/Xem biên nhận |
| Thanh toán | `/parent/payment?invoiceId=` | PH | xem chi tiết, VietQR, tạo cổng VNPay | `GET /tuition/invoices/:id` · `GET /tuition/invoices/:id/vietqr` · `POST /tuition/invoices/:id/pay/gateway` | còn-phải-trả; nút bank transfer (bottom sheet QR + copy nội dung); nút VNPay → mở redirectUrl; HĐ đã trả → nút disabled; VietQR lỗi → "trường chưa cấu hình" |

## 7. Leave

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Xin nghỉ | `/parent/leave` | PH | chọn bé, loại nghỉ (Ốm/Gia đình/Khác), từ/đến, lý do → Gửi | `POST /leave` | gửi → invalidate list → toast + bottom sheet xác nhận |
| Lịch sử đơn nghỉ | `/parent/leave` | PH | xem | `GET /leave/mine` | mỗi đơn: bé, loại, khoảng ngày, badge trạng thái (Chờ/Duyệt/Từ chối) |

## 8. Announcements + Notifications

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Đọc thông báo | `/{role}/announcements` | PH/GV | lọc theo audience | PH `GET /announcements/feed` · GV `GET /announcements?audience=` | PH lọc client, GV lọc server; GV có nút (+) soạn; mỗi item: badge lớp/audience + thời gian + tiêu đề + nội dung |
| Soạn thông báo | `/teacher/announcements/new` | GV | chọn audience (Lớp/PH/Toàn trường), (lớp nếu CLASS), tiêu đề + nội dung → Gửi | `POST /announcements` (publish=true) | CLASS bắt buộc chọn lớp; gửi → invalidate feed+list → toast |
| Trung tâm thông báo | `/{role}/notifications` | PH/GV | xem, đánh dấu đã đọc all, bật/tắt loại | `GET /notifications` · `POST /notifications/read-all` · `GET/PATCH /notifications/preferences` | đếm chưa đọc; đọc-all → về 0; bottom sheet cài đặt: toggle 7 loại (Điểm danh/Báo cáo/Thông báo/Học phí/Thuốc/Nghỉ/Sức khỏe) |

## 9. Home + Menu + Album + Lesson Plan + Profile

| Chức năng | Route | Role | Thao tác | API | Kịch bản |
|---|---|---|---|---|---|
| Home phụ huynh | `/parent` | PH | xem tổng hợp | compose `me` + `/students/mine` + `/announcements/feed` + `/tuition/invoices/mine` | greeting theo tên thật; số con đi học; carousel con; 2 thông báo gần; card "N hóa đơn chưa TT + tổng" (ẩn nếu không có) |
| Home giáo viên | `/teacher` | GV | xem tổng hợp | compose `me` + `/classrooms` + `/medicine?status=PENDING` | greeting; lớp chủ nhiệm + sĩ số; danh sách lớp; card "N yêu cầu thuốc chờ duyệt" (hoặc "không có việc") |
| Thực đơn tuần | `/parent/menu` | PH | xem | `GET /menus` → `GET /menus/:id` | menu mới nhất; meals nhóm theo thứ (Sáng/Trưa/Xế/Tối); rỗng → "chưa có thực đơn" |
| Album ảnh | `/{role}/album` | PH/GV | chọn album, xem ảnh | `GET /albums` → `GET /albums/:id` · `GET /media/:id/file` (AuthImage Bearer) | chip chọn album (+ số ảnh); grid ảnh fetch blob; ảnh lỗi/thiếu file → ô "—" (không vỡ) |
| Giáo án tuần | `/teacher/lesson-plan` | GV | xem | `GET /lesson-plans` → `GET /lesson-plans/:id` | plan mới nhất: chủ đề + tuần + hoạt động theo thứ; rỗng → "chưa có giáo án" |
| Hồ sơ | `/{role}/profile` | PH/GV | xem, đổi ngôn ngữ, đăng xuất | `GET /auth/me` | tên/SĐT thật từ me; toggle VI/EN; "Đổi mật khẩu" (chưa có API); đăng xuất |

---

## Edge cases nên test (toàn cục)

1. **Token hết hạn giữa phiên** → request 401 → http.ts auto refresh 1 lần → retry; nếu refresh fail → về `/login`.
2. **Mạng lỗi** → mọi màn hiển thị nhánh `error` (không trắng màn/crash).
3. **Dữ liệu rỗng** (tenant mới) → mọi list hiển thị empty state có nghĩa.
4. **Đổi ngôn ngữ giữa chừng** → không mất state form đang nhập.
5. **Mutation → list refresh** (invalidateQueries): tạo thuốc/đơn nghỉ/điểm danh/báo cáo/duyệt → list/badge cập nhật ngay không cần reload.
6. **Reload sâu** (`/parent/student/:id` trực tiếp) → RoleGuard fetch `me` → render đúng, không nhảy về login khi đã có token hợp lệ.

> **Trạng thái review**: code integrate đã pass build + dict parity 302/302 + cURL từng domain. Bug nghiêm trọng: không. Đã sửa: gate fetch sức khỏe theo teacher. Sẵn sàng để Codex review.
