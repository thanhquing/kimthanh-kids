/**
 * BL-046 — Bản nháp văn bản pháp lý (tiếng Việt) để seed vào ConsentDocument.
 *
 * ⚠️ ĐÂY LÀ BẢN NHÁP — BẮT BUỘC luật sư/PO rà soát & duyệt trước khi phát hành thật.
 * Cách đổi nội dung an toàn (không ảnh hưởng người đã đồng ý bản cũ):
 *   1) Sửa nội dung + TĂNG `version` (vd "2026-01-draft" → "2026-03-v1").
 *   2) Seed lại: bản cũ tự set isActive=false, bản mới isActive=true.
 *   3) Người dùng sẽ được yêu cầu đồng ý lại bản mới (gate ở đăng nhập).
 */

export const CONSENT_VERSION = "2026-01-draft";

const DRAFT_BANNER =
  "⚠️ BẢN NHÁP — nội dung cần luật sư/PO rà soát và duyệt trước khi phát hành chính thức.\n\n";

export const TERMS_BODY =
  DRAFT_BANNER +
  `# Điều khoản dịch vụ — KimThanh Kids

Phiên bản: ${CONSENT_VERSION}

## 1. Định nghĩa
- "Nền tảng" / "Chúng tôi": phần mềm quản lý trường mầm non KimThanh Kids và đơn vị vận hành.
- "Trường" / "Bạn": tổ chức/cá nhân đăng ký sử dụng dịch vụ cho một cơ sở giáo dục mầm non.
- "Người dùng cuối": quản trị trường, giáo viên, nhân viên, phụ huynh truy cập hệ thống.
- "Dữ liệu của Trường": mọi dữ liệu Trường và người dùng của Trường nhập vào hệ thống, bao gồm dữ liệu của trẻ em.

## 2. Vai trò xử lý dữ liệu
- Trường là **Bên kiểm soát dữ liệu**: quyết định mục đích và cách xử lý Dữ liệu của Trường.
- Nền tảng là **Bên xử lý dữ liệu**: chỉ xử lý theo chỉ dẫn hợp pháp của Trường nhằm cung cấp dịch vụ.
- **Trường tự chịu trách nhiệm** về tính hợp pháp của việc thu thập, độ chính xác của dữ liệu, và **việc xin sự đồng ý của cha mẹ/người giám hộ** đối với dữ liệu trẻ em theo pháp luật Việt Nam (bao gồm Luật Bảo vệ dữ liệu cá nhân).

## 3. Tài khoản & bảo mật
- Trường chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động dưới tài khoản của mình.
- Trường phải cấp quyền cho người dùng đúng vai trò và thu hồi khi không còn nhu cầu.

## 4. Sử dụng hợp lệ
- Không dùng dịch vụ vào mục đích trái pháp luật, xâm phạm quyền riêng tư, hoặc gây hại hệ thống.
- Không tải lên nội dung vi phạm pháp luật hoặc quyền của bên thứ ba.

## 5. Gói cước & thanh toán
- Phí dịch vụ theo bảng giá công bố tại thời điểm đăng ký/gia hạn. Giá đã đồng ý cho kỳ hiện tại không thay đổi tới hết kỳ.
- Chậm thanh toán có thể dẫn tới tạm ngưng hoặc chấm dứt dịch vụ theo quy trình thông báo.

## 6. Giới hạn trách nhiệm
- Dịch vụ được cung cấp trên cơ sở "hiện có" ở mức nỗ lực hợp lý; Nền tảng không cam kết dịch vụ không gián đoạn hay không lỗi.
- Trong phạm vi pháp luật cho phép, Nền tảng không chịu trách nhiệm cho thiệt hại gián tiếp, ngẫu nhiên, hoặc mất mát dữ liệu do lỗi của Trường/người dùng, hoặc do sự kiện bất khả kháng. Tổng trách nhiệm (nếu có) không vượt quá phí Trường đã trả trong 3 tháng gần nhất.

## 7. Tạm ngưng & chấm dứt
- Nền tảng có thể tạm ngưng dịch vụ khi có vi phạm điều khoản hoặc rủi ro bảo mật, kèm thông báo hợp lý khi có thể.
- Khi chấm dứt, Trường có quyền yêu cầu trích xuất dữ liệu trong thời hạn hợp lý trước khi dữ liệu được xóa theo chính sách lưu trữ.

## 8. Thay đổi điều khoản
- Điều khoản có thể được cập nhật. Bản cập nhật có phiên bản mới; người dùng sẽ được yêu cầu đồng ý lại khi đăng nhập.

## 9. Luật áp dụng
- Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp được giải quyết tại cơ quan có thẩm quyền của Việt Nam.

Bằng việc tích "Đồng ý", bạn xác nhận đã đọc, hiểu và chấp thuận toàn bộ Điều khoản dịch vụ này.`;

export const PRIVACY_BODY =
  DRAFT_BANNER +
  `# Chính sách bảo mật & xử lý dữ liệu cá nhân — KimThanh Kids

Phiên bản: ${CONSENT_VERSION}

## 1. Dữ liệu chúng tôi xử lý
- Dữ liệu tài khoản: họ tên, email, số điện thoại, vai trò, thông tin đăng nhập.
- Dữ liệu vận hành do Trường nhập: hồ sơ học sinh (họ tên, ngày sinh, sức khỏe, hình ảnh), thông tin phụ huynh, điểm danh, học phí, thông báo.
- Dữ liệu kỹ thuật: nhật ký truy cập, địa chỉ IP, loại thiết bị (phục vụ bảo mật & vận hành).

## 2. Mục đích & cơ sở pháp lý
- Cung cấp và vận hành dịch vụ theo hợp đồng/điều khoản với Trường.
- Bảo mật, phòng chống gian lận, tuân thủ nghĩa vụ pháp lý.
- Dữ liệu trẻ em được xử lý theo chỉ dẫn của Trường và trên cơ sở **sự đồng ý của cha mẹ/người giám hộ do Trường thu thập** theo Luật Bảo vệ dữ liệu cá nhân.

## 3. Quyền của chủ thể dữ liệu
- Bạn có quyền được biết, truy cập, chỉnh sửa, xóa, hạn chế xử lý, và **rút lại sự đồng ý** đối với dữ liệu cá nhân.
- Yêu cầu thực hiện quyền được gửi tới Trường (bên kiểm soát dữ liệu) hoặc bộ phận hỗ trợ của Nền tảng.

## 4. Chia sẻ & bên thứ ba
- Chúng tôi **không bán** dữ liệu cá nhân.
- Chỉ chia sẻ với nhà cung cấp hạ tầng/thanh toán cần thiết để vận hành (vd cổng thanh toán, lưu trữ), theo hợp đồng bảo mật.

## 5. Lưu trữ & bảo mật
- Dữ liệu được lưu trữ tại Việt Nam, áp dụng biện pháp kỹ thuật và tổ chức hợp lý (mã hóa truyền tải, phân quyền, sao lưu).
- Thời gian lưu trữ theo nhu cầu vận hành và nghĩa vụ pháp lý; dữ liệu được xóa/ẩn danh khi không còn cần thiết.

## 6. Dữ liệu trẻ em
- Dữ liệu trẻ em là dữ liệu nhạy cảm, được bảo vệ tăng cường. Trường có trách nhiệm bảo đảm đã được cha mẹ/người giám hộ đồng ý trước khi nhập liệu.

## 7. Liên hệ
- Bộ phận bảo vệ dữ liệu cá nhân / đầu mối liên hệ: (cập nhật thông tin chính thức trước khi phát hành).

Bằng việc tích "Đồng ý", bạn xác nhận đã đọc và hiểu Chính sách bảo mật này.`;

export const CONSENT_DOCS = [
  {
    type: "TERMS" as const,
    version: CONSENT_VERSION,
    locale: "vi",
    title: "Điều khoản dịch vụ",
    summary: "Điều khoản sử dụng dịch vụ KimThanh Kids.",
    body: TERMS_BODY,
  },
  {
    type: "PRIVACY" as const,
    version: CONSENT_VERSION,
    locale: "vi",
    title: "Chính sách bảo mật",
    summary: "Cách chúng tôi xử lý và bảo vệ dữ liệu cá nhân.",
    body: PRIVACY_BODY,
  },
];
