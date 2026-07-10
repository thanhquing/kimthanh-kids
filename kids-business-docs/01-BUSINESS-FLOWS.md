# KimThanh Kids — Luồng Nghiệp vụ (Business Goal)

> **Đối tượng:** CEO, Product Owner, người dùng nghiệp vụ (chủ trường) — đọc để hiểu **sản phẩm làm gì** và **hành trình người dùng đi như thế nào**, từ đó góp ý flow nào lạ/kém hiệu quả cho người dùng cuối.
> **Không cần biết kỹ thuật.** Mỗi luồng mô tả: *Ai → Làm gì → Để được gì*.
> Cập nhật: 2026-06.

---

## Mục lục
1. [Sản phẩm là gì & giải quyết vấn đề gì](#1-sản-phẩm-là-gì)
2. [Bức tranh tổng thể](#2-bức-tranh-tổng-thể)
3. [Hành trình: Chủ trường mở tài khoản & vận hành](#3-hành-trình-chủ-trường)
4. [Hành trình: Giáo viên một ngày đi dạy](#4-hành-trình-giáo-viên)
5. [Hành trình: Phụ huynh theo dõi con](#5-hành-trình-phụ-huynh)
6. [Hành trình: Y tá chăm sóc sức khỏe](#6-hành-trình-y-tá)
7. [Hành trình: Kế toán thu học phí](#7-hành-trình-kế-toán)
8. [Hành trình: Đội vận hành nền tảng](#8-hành-trình-vận-hành)
9. [Vòng giá trị & vì sao trường nên trả tiền](#9-vòng-giá-trị)
10. [Điểm cần PO/CEO soi & câu hỏi mở](#10-điểm-cần-soi)

---

## 1. Sản phẩm là gì

**KimThanh Kids** là **phần mềm quản lý trường mầm non** dạng cho thuê (SaaS). Mỗi trường có một "không gian riêng" (website + ứng dụng) để:
- Quản lý hồ sơ học sinh, lớp, giáo viên, nhân sự.
- Điểm danh, viết báo cáo hằng ngày cho phụ huynh.
- Theo dõi sức khỏe (chiều cao/cân nặng, thuốc, sự cố, dị ứng), xin nghỉ.
- Thu học phí (quét mã chuyển khoản / tiền mặt / cổng thanh toán) + in chứng từ.
- Giao tiếp: thông báo, thực đơn tuần, giáo án, album ảnh lớp.
- Báo cáo tổng quan cho chủ trường.

**Vấn đề giải quyết:** thay sổ sách giấy + nhóm Zalo rời rạc bằng một hệ thống thống nhất — minh bạch với phụ huynh, nhẹ việc cho giáo viên, rõ tiền cho chủ trường.

---

## 2. Bức tranh tổng thể

```
   ĐỘI VẬN HÀNH (KimThanh)                TRƯỜNG MẦM NON (khách hàng)
   ───────────────────────                ────────────────────────────
   • Tạo/khóa/mở trường                    Chủ trường ── mở tài khoản, chọn gói
   • Quản lý gói cước, hóa đơn                 │
   • Bật/tắt tính năng cho trường              ├── Hiệu trưởng ── điều hành, duyệt
   • Xem chỉ số sử dụng (DAU/MAU)              ├── Giáo viên ── điểm danh, báo cáo, giáo án
                                              ├── Y tá ── sức khỏe, thuốc, sự cố
                                              ├── Kế toán ── học phí, chứng từ
                                              └── Phụ huynh ── theo dõi con, nhận thông báo, trả phí
```

Mỗi trường truy cập qua **địa chỉ riêng** (vd `hoasen.kimthanhkids.vn`). Dữ liệu các trường **tách biệt hoàn toàn**.

---

## 3. Hành trình: Chủ trường

**Mục tiêu:** đưa trường lên hệ thống và bắt đầu vận hành trong ~1 buổi.

1. **Đăng ký trên landing** → chọn gói, điền tên trường + MST + tên miền con + tài khoản chủ trường → có ngay không gian riêng, **gói Miễn phí dùng vĩnh viễn** (tối đa 10 học sinh, 1 giáo viên, 500MB).
   - Nếu chọn gói trả phí: trường vẫn vào dùng Free ngay, đồng thời nhận hóa đơn nâng cấp + mã VietQR để chuyển khoản cho KimThanh Kids.
   - Gói trả phí chỉ kích hoạt sau khi đội vận hành KimThanh xác nhận đã thu tiền trên Platform Console.
2. **Tạo tài khoản nhân sự** (giáo viên, y tá, kế toán, hiệu trưởng) bằng **email hoặc số điện thoại**.
3. **Tạo lớp** và **thêm học sinh**, gán **phụ huynh đại diện** cho từng bé.
4. **Phân công giáo viên** theo lịch tuần (thứ + ca sáng/chiều/cả ngày + nhiệm vụ).
5. **Cấu hình trường:** logo/màu thương hiệu, thông tin ngân hàng + mã số thuế (để thu học phí & xuất chứng từ).
6. **Theo dõi bảng tổng quan:** sĩ số, điểm danh hôm nay, đơn thuốc/nghỉ chờ duyệt, công nợ học phí, doanh thu tháng.
7. Khi vượt giới hạn gói Free → **nâng gói** (Khởi đầu/Chuyên nghiệp/Hệ thống).

> **Giá trị:** kiểm soát toàn trường trên một màn hình, minh bạch tài chính, sẵn sàng quyết toán thuế.

---

## 4. Hành trình: Giáo viên

**Một ngày đi dạy:**
1. Mở app → thấy **lịch phân công tuần** (hôm nay dạy lớp nào, ca nào).
2. **Điểm danh** cả lớp một lần (có mặt / đi muộn / vắng / nghỉ phép).
3. **Soạn báo cáo hằng ngày** cho từng bé (ăn, ngủ, hoạt động, tâm trạng) — gắn ảnh.
   - → Phụ huynh **nhận thông báo** ngay khi báo cáo được tạo.
4. **Đăng giáo án tuần** (chủ đề + hoạt động theo ngày) — *gói Chuyên nghiệp*.
5. **Đăng album ảnh** hoạt động của lớp — *gói Khởi đầu trở lên*.
6. **Gửi thông báo** cho phụ huynh lớp (họp lớp, dặn dò…).
7. Nhận và **duyệt đơn xin nghỉ / yêu cầu cho uống thuốc** từ phụ huynh.

> **Giá trị:** giảm việc thủ công, phụ huynh thấy con được chăm sóc → tin tưởng trường.

---

## 5. Hành trình: Phụ huynh

**Mục tiêu:** an tâm vì biết con đang thế nào, không phải hỏi cô liên tục.
1. Đăng nhập (email/SĐT) → thấy **danh sách con** (nếu có nhiều bé).
2. Xem **báo cáo hằng ngày** + ảnh, **lịch sử điểm danh**, **chỉ số tăng trưởng** (biểu đồ chiều cao/cân nặng).
3. **Gửi yêu cầu cho con uống thuốc** (kèm liều, giờ uống) → theo dõi y tá duyệt/đã cho uống.
4. **Xin nghỉ học** cho con → nhận kết quả duyệt.
5. Xem **thực đơn tuần** + **cảnh báo dị ứng** (hệ thống tự đối chiếu món ăn với dị ứng của bé).
6. Nhận **thông báo** của trường/lớp, xem **album ảnh** lớp con.
7. Nhận **hóa đơn học phí** → **quét mã VietQR** chuyển khoản, hoặc thanh toán qua cổng; xem/in chứng từ.
8. **Hộp thông báo** gom mọi cập nhật quan trọng; tự bật/tắt loại muốn nhận.

> **Giá trị:** minh bạch, tiện, giảm lo lắng — đây là lý do phụ huynh thích và trường giữ chân được khách.

---

## 6. Hành trình: Y tá

1. Ghi **chỉ số sức khỏe** định kỳ (chiều cao, cân nặng, thân nhiệt) → tạo dữ liệu **biểu đồ tăng trưởng** cho phụ huynh.
2. **Duyệt yêu cầu thuốc** của phụ huynh: duyệt → đánh dấu "đã cho uống" (có timeline minh bạch) hoặc từ chối.
3. Ghi nhận **sự cố** (té ngã, sốt…) kèm mức độ + cách xử lý → phụ huynh được thông báo.
4. Quản lý **dị ứng** của bé → dùng cho cảnh báo thực đơn.

> **Giá trị:** hồ sơ sức khỏe rõ ràng, xử lý sự cố minh bạch — giảm rủi ro tranh chấp với phụ huynh.

---

## 7. Hành trình: Kế toán

1. **Lập hóa đơn học phí** cho từng bé (học phí + tiền ăn + khoản khác, có giảm giá) — số hóa đơn tự tăng theo năm.
2. Phụ huynh trả tiền → **ghi nhận thanh toán** (tiền mặt) hoặc tự đối soát (VietQR/cổng).
3. Theo dõi trạng thái: **chưa trả / trả một phần / đã trả / quá hạn** (tự đánh dấu quá hạn).
4. **In chứng từ HTML** để gửi phụ huynh / lưu hồ sơ; **xuất CSV** để đưa vào phần mềm kế toán, quyết toán thuế (đã có mã số thuế + thông tin ngân hàng).

> **Giá trị:** thu đúng – đủ – nhanh, sổ sách sẵn sàng cho thuế, mọi thao tác sửa/hủy/thanh toán đều được ghi nhật ký.

---

## 8. Hành trình: Đội vận hành (KimThanh)

1. **Tạo / khóa / mở lại** trường khách hàng.
2. Quản lý **gói cước, hóa đơn nền tảng** (trường trả tiền cho KimThanh), gồm hóa đơn nâng cấp tạo từ landing.
3. Đối soát VietQR MVP bằng tay: khi thấy tiền về tài khoản, bấm **Đã thu** để hệ thống tự nâng gói cho trường.
4. Quản lý **bài viết landing**: thêm/sửa nháp, xuất bản/hủy xuất bản; landing đọc bài public từ dữ liệu này.
5. **Bật/tắt tính năng riêng** cho từng trường (vượt ngoài gói — cho thỏa thuận đặc biệt).
6. Xem **chỉ số sử dụng**: số trường, người dùng hoạt động ngày/tuần/tháng (DAU/WAU/MAU), tính năng được dùng nhiều — để biết sản phẩm "sống" thế nào.

> **Giá trị:** vận hành nhiều trường tập trung, ra quyết định kinh doanh dựa trên số liệu thật.

---

## 9. Vòng giá trị

```
  Trường lên hệ thống ──▶ Giáo viên dùng hằng ngày ──▶ Phụ huynh thấy minh bạch
        ▲                                                      │
        │                                                      ▼
   Chủ trường giữ khách + tăng uy tín ◀── Phụ huynh hài lòng, giới thiệu thêm
```

- **Free** kéo trường nhỏ vào dùng thử thật (không giới hạn thời gian) → quen tay.
- Khi trường lớn lên (vượt 10 HS / cần album, giáo án) → **nâng gói** một cách tự nhiên.
- Phụ huynh hài lòng = vũ khí marketing miễn phí cho trường = trường gắn bó với KimThanh.

---

## 10. Điểm cần PO/CEO soi & câu hỏi mở

Những chỗ nên review xem có "lạ" hoặc kém hiệu quả với người dùng cuối:

1. **Báo cáo hằng ngày chỉ thông báo khi tạo MỚI** (không báo lại khi giáo viên sửa). → Có cần "báo cáo đã cập nhật" không, hay sẽ làm phiền phụ huynh?
2. **Đơn nghỉ/đơn thuốc chỉ duyệt 1 lần** (không sửa lại sau khi duyệt). → Có cần luồng "thu hồi/sửa quyết định"?
3. **Giới hạn phụ huynh = số học sinh** (1 bé ~ 1 phụ huynh đại diện). → Thực tế nhiều bé có cả ba lẫn mẹ muốn tài khoản riêng — có nên cho 2 phụ huynh/bé?
4. **Học phí lập theo từng bé thủ công.** → Có cần "lập hàng loạt cả lớp theo biểu phí" để kế toán nhẹ việc?
5. **Cảnh báo dị ứng so khớp theo chữ** (tên món chứa tên dị nguyên). → Đủ tin cậy chưa, hay cần danh mục dị nguyên chuẩn hóa?
6. **Chat GV–PH là Coming Soon** (chưa có module, chỉ badge "Sắp có" ở bảng giá). → Trường có thực sự cần nhắn tin 1-1 trong app, hay thông báo + báo cáo là đủ? Ưu tiên build tới đâu?
7. **Thanh toán VietQR phải đối soát thủ công** (chưa tự khớp giao dịch ngân hàng). → Mức độ ưu tiên tự động đối soát?
8. **Push thông báo điện thoại (FCM)** sẽ làm ở phase mobile. → Hiện thông báo chỉ hiện trong app; có chấp nhận được giai đoạn đầu?

> Những câu hỏi này nên được chốt trước khi bước vào phase UI/mobile để tránh làm lại.
