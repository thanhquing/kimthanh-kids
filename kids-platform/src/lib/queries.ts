import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate các nhóm dữ liệu phụ thuộc trạng thái billing/tenant — gọi sau mutation
 * có ảnh hưởng CHÉO TRANG (markPaid, suspend/reactivate, tạo HĐ/trường, đổi giá gói)
 * để Tổng quan / Trường thuê / Thuê bao / Hóa đơn / Cần hành động không hiển thị số cũ.
 *
 * Prefix-match của react-query: key ["tenants"] phủ cả ["tenants","list",...] lẫn
 * ["tenants","stats"]; tương tự invoices/subscriptions.
 */
export function invalidatePlatformData(qc: QueryClient) {
  for (const key of [
    "platform-overview",
    "platform-revenue",
    "tenants",
    "subscriptions",
    "invoices",
    "worklist",
    "quick-search",
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}
