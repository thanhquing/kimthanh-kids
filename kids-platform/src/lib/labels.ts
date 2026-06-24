// Nhãn tiếng Việt + class badge — khớp mock-ui/platform.

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
  VOID: { label: "Đã hủy", badge: "b-slate" },
};

export const TIER_LABEL: Record<string, string> = {
  FREE: "Miễn phí",
  STARTER: "Khởi đầu",
  PRO: "Chuyên nghiệp",
  ENTERPRISE: "Hệ thống",
  CUSTOM: "Triển khai riêng",
};

export const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: "Hàng tháng",
  QUARTERLY: "Hàng quý",
  ANNUAL: "Hàng năm",
};

export function badgeFor(map: Record<string, { label: string; badge: string }>, key?: string) {
  return (key && map[key]) || { label: key ?? "—", badge: "b-slate" };
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
}
