# kids-crm — Ý tưởng chức năng (tương quan với kids-mobile-web)

> kids-mobile-web là **app người dùng cuối** (phụ huynh + giáo viên): đọc dữ liệu + thực hiện hành động phía mình. kids-crm là **bảng điều khiển vận hành của trường**: cấp dữ liệu, duyệt, tổng hợp, đối soát. Tài liệu này liệt kê CRM **nên có gì** để mỗi chức năng mobile thực sự hữu ích — theo từng vai trò: `SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `NURSE`, `FINANCE`.
>
> Nguyên tắc: **mỗi hành động trên mobile phải có đầu đối ứng trên CRM** (nguồn dữ liệu HOẶC nơi xử lý tiếp). Backend (kids-api Phase 1 A→G) đã có hầu hết endpoint — CRM chủ yếu là UI vận hành trên nền đó.

## Bản đồ tương quan Mobile ↔ CRM (tổng quan)

| Mobile (PH/GV) làm gì | CRM phải có gì (role) | Trạng thái backend |
|---|---|---|
| Đăng nhập bằng SĐT | Cấp tài khoản + SĐT + mật khẩu mặc định (generate thuật toán), reset mật khẩu (ADMIN) | provisioning có; reset chưa có |
| Xem danh sách con / sĩ số lớp | Quản lý học sinh + xếp lớp + gán phụ huynh (ADMIN) | students/classrooms CRUD có |
| GV điểm danh | Bảng tổng hợp điểm danh toàn trường + cảnh báo vắng (ADMIN/PRINCIPAL) | attendance có |
| GV gửi báo cáo ngày | Theo dõi % báo cáo đã gửi / nhắc GV (PRINCIPAL) | daily-reports có |
| PH gửi yêu cầu thuốc → GV duyệt | NURSE quản lý lịch cho uống + log thực hiện y tế (NURSE) | medicine/health có |
| PH xem & thanh toán học phí | FINANCE phát hành hóa đơn + đối soát thanh toán + nhắc nợ (FINANCE) | tuition có |
| PH xin nghỉ | Duyệt/từ chối đơn nghỉ (TEACHER/ADMIN) | leave có |
| Đọc thông báo | Soạn & lên lịch thông báo theo audience (ADMIN/PRINCIPAL/TEACHER) | announcements có |
| Xem thực đơn / giáo án / album | Soạn thực đơn + cảnh báo dị ứng, soạn giáo án, upload album (ADMIN/NURSE/TEACHER) | menus/lesson-plans/albums có |

---

## Theo vai trò

### SCHOOL_ADMIN (quản trị trường) — nền tảng cho mọi thứ
Đây là role **bắt buộc làm trước** vì mobile không có dữ liệu nếu thiếu provisioning.
- **Quản lý người dùng**: thêm/sửa/vô hiệu GV, PH, nhân sự; **cấp tài khoản kèm SĐT + mật khẩu mặc định** (thuật toán generate); **reset mật khẩu** (mobile defer phần này → CRM phải gánh). Hiển thị cột SĐT (không email) — đồng bộ với login mobile bằng SĐT.
- **Quản lý học sinh**: hồ sơ bé, **xếp lớp**, **gán phụ huynh ↔ học sinh** (quyết định `/students/mine` của PH), trạng thái (đang học/nghỉ/tốt nghiệp).
- **Quản lý lớp**: tạo lớp, gán GV chủ nhiệm, sĩ số/độ tuổi.
- **Phân quyền & năm học**: gán role membership; mở/khoá truy cập.
- *Vì sao hữu ích*: nếu ADMIN không xếp lớp + gán PH, mobile của PH trống trơn và GV không có sĩ số.

### PRINCIPAL (hiệu trưởng) — giám sát & chất lượng
- **Dashboard toàn trường**: sĩ số, tỉ lệ điểm danh hôm nay, % báo cáo ngày đã gửi, đơn nghỉ chờ duyệt, công nợ. (đã có `/dashboard/summary` cho admin/principal)
- **Giám sát báo cáo ngày**: lớp nào GV chưa gửi báo cáo → nhắc; mobile GV chỉ soạn, CRM theo dõi độ phủ.
- **Giám sát điểm danh**: bé vắng nhiều ngày liên tiếp → cảnh báo; tổng hợp theo lớp/tháng.
- **Duyệt nội dung**: phê duyệt thông báo toàn trường trước khi phát (mobile GV chỉ gửi lớp).

### TEACHER (giáo viên) — đa số đã có trên mobile, CRM bổ trợ desktop
- **Bản desktop của**: điểm danh, soạn báo cáo, duyệt thuốc, soạn thông báo lớp, giáo án — thao tác nhanh hơn trên màn lớn (nhập hàng loạt).
- **Duyệt đơn nghỉ của lớp mình** (mobile chưa có màn duyệt nghỉ cho GV — chỉ PH gửi). → CRM nên có inbox đơn nghỉ.
- **Quản lý album lớp**: **upload ảnh** (mobile chỉ xem; album cần ảnh từ đâu? → CRM/GV upload). Đây là mắt xích còn thiếu: mobile xem album nhưng chưa có nơi đẩy ảnh.
- **Soạn giáo án tuần** kèm hoạt động theo ngày (mobile GV chỉ xem).

### NURSE (y tá) — mảng sức khỏe mobile chưa khai thác hết
- **Lịch cho uống thuốc hôm nay**: từ các yêu cầu APPROVED → danh sách bé cần cho uống theo giờ + **log từng lần thực hiện** (mobile mới có duyệt + đánh dấu "đã cho uống" 1 lần; y tá cần lịch chi tiết).
- **Hồ sơ sức khỏe**: quản lý **dị ứng** từng bé (mobile chỉ đọc), tiêm chủng, chỉ số cơ bản.
- **Sự cố/incident**: ghi nhận sự cố (té ngã, sốt…) + mức độ + xử lý → mobile PH nên được xem sự cố của con (hiện mobile chỉ GV xem). *Gợi ý: mở khối sức khỏe cho PH trên mobile vì API `/incidents/student/:id` đã cho PARENT.*
- **Soát dị ứng thực đơn**: đối chiếu thực đơn tuần với dị ứng của bé (`/menus/:id/allergy-warnings`) → cảnh báo bếp.

### FINANCE (kế toán) — đối ứng học phí mobile
- **Phát hành hóa đơn**: tạo hóa đơn học phí theo kỳ/lớp/bé → là nguồn của `/tuition/invoices/mine` mà PH thấy. (mobile chỉ xem + trả)
- **Đối soát thanh toán**: theo dõi VietQR/VNPay đã trả, khớp số tiền, đánh dấu PAID/PARTIAL; xử lý webhook.
- **Nhắc nợ**: danh sách quá hạn → bắn thông báo (loại INVOICE) tới PH.
- **Báo cáo doanh thu**: tổng thu theo kỳ, công nợ tồn.

---

## Mắt xích còn THIẾU (mobile có màn nhưng chưa có nguồn/đối ứng) — ưu tiên cho CRM

1. **Upload ảnh album** — mobile xem album nhưng chưa nơi nào đẩy ảnh (seed thiếu file). CRM/GV cần màn upload media → album. (cao)
2. **Reset mật khẩu** — mobile defer; CRM ADMIN phải có nút reset (vì không có self-service). (cao)
3. **Duyệt đơn xin nghỉ** — PH gửi trên mobile nhưng chưa role nào duyệt trên mobile. CRM cần inbox duyệt nghỉ (GV/ADMIN). (cao)
4. **Phát hành hóa đơn** — PH chỉ thấy hóa đơn có sẵn; FINANCE cần màn tạo/đợt phát hành. (cao)
5. **Lịch cho uống thuốc + log y tế** — mobile duyệt thuốc nhưng thực thi hằng ngày thuộc NURSE. (trung bình)
6. **Soạn thực đơn / giáo án** — mobile chỉ xem; cần màn soạn (ADMIN/NURSE/GV). (trung bình)
7. **Quản lý người đón / điểm danh ra-về** — đã bổ sung API `pickup` + CRM `PickupPage`; mobile có thể đọc cùng nguồn để hiển thị người được phép đón và lịch sử CHECK_IN/CHECK_OUT.

---

## Gợi ý nâng cấp mobile-web (để PH/GV dùng hiệu quả hơn) — đối chiếu CRM

- **PH xem sức khỏe con**: API `/allergies|/incidents/student/:id` đã cho PARENT → mở khối sức khỏe cho PH trên StudentDetail (hiện chỉ GV). Tương ứng NURSE nhập liệu trên CRM.
- **GV duyệt đơn nghỉ ngay trên mobile** thay vì chỉ CRM — đối ứng nhanh với PH gửi.
- **PH nhận biên nhận sau thanh toán** + lịch sử thanh toán — đối ứng FINANCE đối soát.
- **Đính kèm ảnh vào báo cáo ngày** — đã nối mobile GV upload ảnh qua media, `POST /daily-reports` nhận `photoIds`, PH xem ảnh trong report feed.

> Mục tiêu: mỗi vòng nghiệp vụ **khép kín** giữa mobile (PH/GV) và CRM (admin/principal/nurse/finance). Backend đã sẵn phần lớn endpoint; CRM là lớp vận hành còn thiếu để dữ liệu mobile "sống" thật.

## Trạng thái triển khai CRM

- Đã nối trong `kids-crm`: reset mật khẩu nhân sự, phân công tuần, duyệt đơn nghỉ, thực đơn tuần + cảnh báo dị ứng, album/upload ảnh, giáo án tuần, notifications feed/preferences, quản lý người đón + nhật ký CHECK_IN/CHECK_OUT.
- Đã nối follow-up mobile-web: PH xem dị ứng/sự cố trong hồ sơ bé, PH/GV xem đón-trả, GV ghi CHECK_IN/CHECK_OUT, GV duyệt/từ chối đơn nghỉ, GV đính kèm ảnh báo cáo ngày và PH xem ảnh trong feed.
- Backend bổ sung mới: `PATCH /tenant/members/:userId/password` để ADMIN/PRINCIPAL đặt lại mật khẩu và revoke refresh token hiện có.
- Verify gần nhất: `kids-crm pnpm build` sạch; `kids-api pnpm exec tsc --noEmit` + `pnpm lint` sạch. `test:e2e` cần chạy lại khi Docker/Postgres local hoạt động.
