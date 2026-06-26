// Nhãn tiếng Việt + class badge dùng chung cho CRM.

export const TENANT_STATUS: Record<string, { label: string; badge: string }> = {
  TRIAL: { label: "Dùng thử", badge: "b-amber" },
  ACTIVE: { label: "Hoạt động", badge: "b-green" },
  PAST_DUE: { label: "Quá hạn", badge: "b-red" },
  SUSPENDED: { label: "Tạm khóa", badge: "b-slate" },
  CANCELED: { label: "Đã hủy", badge: "b-slate" },
  EXPIRED: { label: "Hết hạn", badge: "b-slate" },
};

export const SUB_STATUS: Record<string, { label: string; badge: string }> = {
  TRIALING: { label: "Dùng thử", badge: "b-amber" },
  ACTIVE: { label: "Hoạt động", badge: "b-green" },
  PAST_DUE: { label: "Quá hạn", badge: "b-red" },
  SUSPENDED: { label: "Tạm khóa", badge: "b-slate" },
  CANCELED: { label: "Đã hủy", badge: "b-slate" },
  EXPIRED: { label: "Hết hạn", badge: "b-slate" },
};

export const INVOICE_STATUS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Nháp", badge: "b-slate" },
  OPEN: { label: "Chờ thu", badge: "b-amber" },
  PAID: { label: "Đã thu", badge: "b-green" },
  PAST_DUE: { label: "Quá hạn", badge: "b-red" },
  OVERDUE: { label: "Quá hạn", badge: "b-red" },
  VOID: { label: "Đã hủy", badge: "b-slate" },
  UNCOLLECTIBLE: { label: "Khó đòi", badge: "b-slate" },
};

export const TIER_LABEL: Record<string, string> = {
  FREE: "Miễn phí",
  STARTER: "Khởi đầu",
  PRO: "Chuyên nghiệp",
  ENTERPRISE: "Hệ thống",
  CUSTOM: "Triển khai riêng",
};

// Màu badge theo bậc gói — khớp mock plans.html.
export const TIER_BADGE: Record<string, string> = {
  FREE: "b-slate",
  STARTER: "b-peach",
  PRO: "b-blue",
  ENTERPRISE: "b-green",
  CUSTOM: "b-slate",
};

export const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: "Hàng tháng",
  QUARTERLY: "Hàng quý",
  ANNUAL: "Hàng năm",
};

export const BILLING_MODE_LABEL: Record<string, string> = {
  GATEWAY: "Cổng thanh toán",
  MANUAL: "Thủ công",
  DEDICATED_FREE: "Miễn phí (triển khai riêng)",
};

export const TENANCY_LABEL: Record<string, string> = {
  POOL: "Dùng chung",
  SILO: "Riêng biệt",
};

export const METRIC_LABEL: Record<string, string> = {
  STUDENTS: "Học sinh",
  TEACHERS: "Giáo viên",
  CLASSROOMS: "Lớp học",
  SCHOOLS: "Cơ sở",
  STORAGE_MB: "Lưu trữ",
  PUSH_PER_MONTH: "Thông báo đẩy / tháng",
  ADMIN_USERS: "Tài khoản quản trị",
};

// Nhãn event vận hành (UsageEvent.type) + hành động audit (AuditLog.action).
// Đều là chuỗi mở → có map cho cái phổ biến, fallback raw.
const EVENT_LABEL: Record<string, string> = {
  login: "Đăng nhập",
  signup: "Đăng ký",
  logout: "Đăng xuất",
};
export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ?? type;
}

const ACTION_LABEL: Record<string, string> = {
  // Nền tảng
  "platform.tenant.create": "Tạo trường (nền tảng)",
  "platform.tenant.impersonate": "Đăng nhập thay (impersonate)",
  "platform.tenant.suspend": "Tạm khóa trường",
  "platform.tenant.reactivate": "Mở lại trường",
  // Vòng đời trường / thuê bao
  "tenant.signup": "Đăng ký trường mới",
  "tenant.settings.update": "Cập nhật cài đặt trường",
  // Thành viên
  "member.invite": "Mời thành viên",
  "member.create": "Tạo thành viên",
  "member.activate": "Kích hoạt thành viên",
  "member.deactivate": "Ngừng thành viên",
  // Nghiệp vụ
  "classroom.create": "Tạo lớp học",
  "student.delete": "Xóa học sinh",
  "invoice.payment": "Thanh toán hóa đơn",
  "invoice.cancel": "Hủy hóa đơn",
};
export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** Trạng thái HIỂN THỊ của hóa đơn: HĐ chưa trả mà đã quá hạn theo ngày → "Quá hạn"
 *  (dù status DB còn OPEN vì cron chưa chạy) — khớp filter/worklist/tổng quan. */
export function invoiceDisplayStatus(status: string, dueDate?: string | null): string {
  if (status === "OPEN" && dueDate && new Date(dueDate).getTime() < Date.now()) return "OVERDUE";
  return status;
}

export function badgeFor(map: Record<string, { label: string; badge: string }>, key?: string) {
  return (key && map[key]) || { label: key ?? "—", badge: "b-slate" };
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
