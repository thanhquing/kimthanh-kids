// Nhãn enum song ngữ (vi/en) + class badge — khớp mock-ui/platform.
// Tự đọc ngôn ngữ hiện tại từ languageStore (non-reactive); component tiêu thụ phải
// subscribe ngôn ngữ qua `useT()` ở chỗ khác để re-render khi đổi VI/EN.
import { languageStore } from "./language";

type Bi = { vi: string; en: string };
const pick = (b: Bi): string => b[languageStore.get()];

type StatusMap = Record<string, { label: Bi; badge: string }>;

export const TENANT_STATUS: StatusMap = {
  TRIAL: { label: { vi: "Dùng thử", en: "Trial" }, badge: "b-amber" },
  ACTIVE: { label: { vi: "Hoạt động", en: "Active" }, badge: "b-green" },
  PAST_DUE: { label: { vi: "Quá hạn", en: "Past due" }, badge: "b-red" },
  SUSPENDED: { label: { vi: "Tạm khóa", en: "Suspended" }, badge: "b-slate" },
  CANCELED: { label: { vi: "Đã hủy", en: "Canceled" }, badge: "b-slate" },
  EXPIRED: { label: { vi: "Hết hạn", en: "Expired" }, badge: "b-slate" },
};

export const SUB_STATUS: StatusMap = {
  TRIALING: { label: { vi: "Dùng thử", en: "Trialing" }, badge: "b-amber" },
  ACTIVE: { label: { vi: "Hoạt động", en: "Active" }, badge: "b-green" },
  PAST_DUE: { label: { vi: "Quá hạn", en: "Past due" }, badge: "b-red" },
  SUSPENDED: { label: { vi: "Tạm khóa", en: "Suspended" }, badge: "b-slate" },
  CANCELED: { label: { vi: "Đã hủy", en: "Canceled" }, badge: "b-slate" },
  EXPIRED: { label: { vi: "Hết hạn", en: "Expired" }, badge: "b-slate" },
};

export const INVOICE_STATUS: StatusMap = {
  DRAFT: { label: { vi: "Nháp", en: "Draft" }, badge: "b-slate" },
  OPEN: { label: { vi: "Chờ thu", en: "Open" }, badge: "b-amber" },
  PAID: { label: { vi: "Đã thu", en: "Paid" }, badge: "b-green" },
  PAST_DUE: { label: { vi: "Quá hạn", en: "Past due" }, badge: "b-red" },
  OVERDUE: { label: { vi: "Quá hạn", en: "Overdue" }, badge: "b-red" },
  VOID: { label: { vi: "Đã hủy", en: "Void" }, badge: "b-slate" },
  UNCOLLECTIBLE: { label: { vi: "Khó đòi", en: "Uncollectible" }, badge: "b-slate" },
};

const TIER: Record<string, Bi> = {
  FREE: { vi: "Miễn phí", en: "Free" },
  STARTER: { vi: "Khởi đầu", en: "Starter" },
  PRO: { vi: "Chuyên nghiệp", en: "Pro" },
  ENTERPRISE: { vi: "Hệ thống", en: "Enterprise" },
  CUSTOM: { vi: "Triển khai riêng", en: "Custom" },
};
export function tierLabel(tier?: string | null): string {
  return (tier && TIER[tier] && pick(TIER[tier])) || tier || "—";
}

// Màu badge theo bậc gói — khớp mock plans.html (ngôn ngữ-trung tính).
export const TIER_BADGE: Record<string, string> = {
  FREE: "b-slate",
  STARTER: "b-peach",
  PRO: "b-blue",
  ENTERPRISE: "b-green",
  CUSTOM: "b-slate",
};

const CYCLE: Record<string, Bi> = {
  MONTHLY: { vi: "Hàng tháng", en: "Monthly" },
  QUARTERLY: { vi: "Hàng quý", en: "Quarterly" },
  ANNUAL: { vi: "Hàng năm", en: "Annual" },
};
export function cycleLabel(cycle?: string | null): string {
  return (cycle && CYCLE[cycle] && pick(CYCLE[cycle])) || cycle || "—";
}

const BILLING_MODE: Record<string, Bi> = {
  GATEWAY: { vi: "Cổng thanh toán", en: "Payment gateway" },
  MANUAL: { vi: "Thủ công", en: "Manual" },
  DEDICATED_FREE: { vi: "Miễn phí (triển khai riêng)", en: "Free (dedicated)" },
};
export function billingModeLabel(mode?: string | null): string {
  return (mode && BILLING_MODE[mode] && pick(BILLING_MODE[mode])) || mode || "—";
}

const TENANCY: Record<string, Bi> = {
  POOL: { vi: "Dùng chung", en: "Shared" },
  SILO: { vi: "Riêng biệt", en: "Dedicated" },
};
export function tenancyLabel(mode?: string | null): string {
  return (mode && TENANCY[mode] && pick(TENANCY[mode])) || mode || "—";
}

const METRIC: Record<string, Bi> = {
  STUDENTS: { vi: "Học sinh", en: "Students" },
  TEACHERS: { vi: "Giáo viên", en: "Teachers" },
  CLASSROOMS: { vi: "Lớp học", en: "Classrooms" },
  SCHOOLS: { vi: "Cơ sở", en: "Schools" },
  STORAGE_MB: { vi: "Lưu trữ", en: "Storage" },
  PUSH_PER_MONTH: { vi: "Thông báo đẩy / tháng", en: "Push / month" },
  ADMIN_USERS: { vi: "Tài khoản quản trị", en: "Admin users" },
};
export function metricLabel(metric?: string | null): string {
  return (metric && METRIC[metric] && pick(METRIC[metric])) || metric || "—";
}

// Nhãn event vận hành (UsageEvent.type) + hành động audit (AuditLog.action).
// Đều là chuỗi mở → có map cho cái phổ biến, fallback raw.
const EVENT_LABEL: Record<string, Bi> = {
  login: { vi: "Đăng nhập", en: "Login" },
  signup: { vi: "Đăng ký", en: "Sign up" },
  logout: { vi: "Đăng xuất", en: "Logout" },
};
export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ? pick(EVENT_LABEL[type]) : type;
}

const ACTION_LABEL: Record<string, Bi> = {
  // Nền tảng
  "platform.tenant.create": { vi: "Tạo trường (nền tảng)", en: "Create tenant (platform)" },
  "platform.tenant.impersonate": { vi: "Đăng nhập thay (impersonate)", en: "Impersonate" },
  "platform.tenant.suspend": { vi: "Tạm khóa trường", en: "Suspend tenant" },
  "platform.tenant.reactivate": { vi: "Mở lại trường", en: "Reactivate tenant" },
  // Vòng đời trường / thuê bao
  "tenant.signup": { vi: "Đăng ký trường mới", en: "New tenant signup" },
  "tenant.settings.update": { vi: "Cập nhật cài đặt trường", en: "Update tenant settings" },
  // Thành viên
  "member.invite": { vi: "Mời thành viên", en: "Invite member" },
  "member.create": { vi: "Tạo thành viên", en: "Create member" },
  "member.activate": { vi: "Kích hoạt thành viên", en: "Activate member" },
  "member.deactivate": { vi: "Ngừng thành viên", en: "Deactivate member" },
  // Nghiệp vụ
  "classroom.create": { vi: "Tạo lớp học", en: "Create classroom" },
  "student.delete": { vi: "Xóa học sinh", en: "Delete student" },
  "invoice.payment": { vi: "Thanh toán hóa đơn", en: "Invoice payment" },
  "invoice.cancel": { vi: "Hủy hóa đơn", en: "Cancel invoice" },
};
export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ? pick(ACTION_LABEL[action]) : action;
}

/** Trạng thái HIỂN THỊ của hóa đơn: HĐ chưa trả mà đã quá hạn theo ngày → "Quá hạn"
 *  (dù status DB còn OPEN vì cron chưa chạy) — khớp filter/worklist/tổng quan. */
export function invoiceDisplayStatus(status: string, dueDate?: string | null): string {
  if (status === "OPEN" && dueDate && new Date(dueDate).getTime() < Date.now()) return "OVERDUE";
  return status;
}

export function badgeFor(map: StatusMap, key?: string): { label: string; badge: string } {
  const entry = key ? map[key] : undefined;
  return entry ? { label: pick(entry.label), badge: entry.badge } : { label: key ?? "—", badge: "b-slate" };
}

function dateLocale(): string {
  return languageStore.get() === "en" ? "en-GB" : "vi-VN";
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(dateLocale());
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(dateLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
