// BL-006: copy lỗi ổn định theo error.code cho landing (chỉ VI — landing không có i18n).
// Ưu tiên map theo code → message backend (đã localize) → fallback truyền vào.
import { ApiError } from "@/api/http";

const ERROR_MESSAGES: Record<string, string> = {
  QUOTA_EXCEEDED: "Đã đạt giới hạn của gói. Vui lòng nâng cấp gói để tiếp tục.",
  FEATURE_NOT_AVAILABLE: "Tính năng này không có trong gói hiện tại. Vui lòng nâng cấp gói.",
  NO_BANK_CONFIG: "Chưa cấu hình tài khoản ngân hàng. Vui lòng liên hệ để được hỗ trợ.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  VALIDATION_FAILED: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  INVALID_CREDENTIALS: "Email/số điện thoại hoặc mật khẩu không đúng.",
  TENANT_REQUIRED: "Không xác định được trường.",
  ACCOUNT_LOCKED: "Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.",
  SLUG_UNAVAILABLE: "Tên định danh trường này đã được sử dụng. Vui lòng chọn tên khác.",
  NO_PUBLIC_PRICE:
    "Gói này chưa có bảng giá công khai. Vui lòng dùng trang Liên hệ để được tư vấn.",
};

const GENERIC = "Có lỗi xảy ra, vui lòng thử lại.";

/** Message hiển thị cho lỗi bất kỳ: map theo code, fallback message backend rồi `fallback`. */
export function errorMessage(e: unknown, fallback: string = GENERIC): string {
  if (e instanceof ApiError) {
    return ERROR_MESSAGES[e.code] ?? e.message ?? fallback;
  }
  return fallback;
}
