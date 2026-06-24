import { api } from "./http";

// Kiểu dữ liệu khai theo ledger UI_API_FLOW_TEST + schema kids-api (spec OpenAPI mỏng → khai tay).
// LƯU Ý: với endpoint phân trang, TransformInterceptor trả { success, data: items[], meta }.
// http.ts bóc `data` → các hàm list dưới đây nhận về MẢNG trực tiếp (meta hiện chưa dùng ở UI).

export type Plan = {
  id: string;
  code: string;
  name: string;
  tier: string;
  description?: string | null;
  isPublic: boolean;
  prices?: { billingCycle: string; currency: string; amount: number }[];
  features?: { featureKey: string; enabled: boolean }[];
  limits?: { metric: string; limitValue: number | null; enforcement: string }[];
};

export type Tenant = {
  id: string;
  slug: string;
  legalName: string;
  status: string;
  planTier: string;
  tenancyMode?: string;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  createdAt: string;
  settings?: { displayName?: string | null; primaryColor?: string | null } | null;
  subscription?: {
    status?: string;
    billingCycle?: string;
    currentPeriodEnd?: string | null;
    plan?: Plan;
    invoices?: PlatformInvoice[];
  } | null;
  schools?: { id: string }[];
  _count?: { schools?: number };
  // Bổ sung ở GET /platform/tenants (list) cho bảng Tenants:
  billingCycle?: string | null;
  studentCount?: number;
  mrr?: number;
};

export type TenantStats = {
  total: number;
  ACTIVE: number;
  TRIAL: number;
  PAST_DUE: number;
  SUSPENDED: number;
};

export type Subscription = {
  id: string;
  tenantId: string;
  status: string;
  billingCycle?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  autoRenew?: boolean;
  plan?: Plan;
};

export type PlatformInvoice = {
  id: string;
  invoiceNumber?: string;
  tenantId: string;
  period?: string;
  total?: number;
  amountDue?: number;
  status: string;
  dueDate?: string | null;
  lines?: { label: string; amount: number }[];
};

export type Coupon = {
  id: string;
  code: string;
  kind: string;
  amount: number;
  duration: string;
  maxRedemptions?: number | null;
  redemptions?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
};

// 1 điểm doanh thu theo tháng. source: CRON (số thực) | BACKFILL | DERIVED (suy ngược, gần đúng).
export type RevenuePoint = {
  period: string; // "YYYY-MM"
  month: string; // "T6"
  value: number; // VND/tháng
  source: "CRON" | "BACKFILL" | "DERIVED";
};

export type RevenueSeries = { months: number; series: RevenuePoint[]; growthPct: number };

// Payload dashboard nền tảng (GET /platform/overview). Số tiền: VND/tháng.
export type DashboardOverview = {
  kpis: {
    tenants: number;
    activeTenants: number;
    trialTenants: number;
    overdueInvoices: number;
    suspendedTenants: number;
    mrr: number;
  };
  mrrSeries: RevenuePoint[];
  mrrGrowthPct: number;
  planDistribution: { tier: string; count: number }[];
  recentTenants: {
    id: string;
    slug: string;
    displayName: string;
    status: string;
    planName: string | null;
    trialEndsAt: string | null;
  }[];
  recentOverdue: {
    id: string;
    invoiceNumber: string;
    tenantName: string | null;
    amountDue: number;
    dueAt: string | null;
    daysLate: number | null;
  }[];
};

export type CreateTenantInput = {
  schoolName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
};

export type CreatePlanInput = {
  code: string;
  name: string;
  tier: string;
  description?: string;
  isPublic?: boolean;
  trialDays?: number;
  prices?: { billingCycle: string; currency?: string; amount: number }[];
  features?: { featureKey: string; enabled?: boolean }[];
  limits?: { metric: string; limitValue: number | null; enforcement?: string }[];
};

export type CreateCouponInput = {
  code: string;
  kind: string;
  amount: number;
  duration?: string;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
};

export type EntitlementInput = {
  featureKey?: string;
  enabled?: boolean;
  metric?: string;
  limitValue?: number | null;
  reason?: string;
};

// ─── theo đúng luồng cURL đã test (ledger Platform Tenant) ───
export const platform = {
  overview: () => api.get<DashboardOverview>("/platform/overview"),
  revenue: (months: number) =>
    api.get<RevenueSeries>("/platform/revenue", { query: { months } }),

  listTenants: (page = 1, status?: string, q?: string) =>
    api.getPage<Tenant>("/platform/tenants", { query: { page, status, q: q || undefined } }),
  tenantStats: () => api.get<TenantStats>("/platform/tenants/stats"),
  getTenant: (id: string) => api.get<Tenant>(`/platform/tenants/${id}`),
  createTenant: (body: CreateTenantInput) =>
    api.post<{ tenant: Tenant }>("/platform/tenants", body),
  suspend: (id: string) => api.post(`/platform/tenants/${id}/suspend`),
  reactivate: (id: string) => api.post(`/platform/tenants/${id}/reactivate`),
  impersonate: (id: string) =>
    api.post<{ accessToken: string; tenant: Tenant }>(`/platform/tenants/${id}/impersonate`),
  setEntitlement: (id: string, body: EntitlementInput) =>
    api.post(`/platform/tenants/${id}/entitlements`, body),

  listSubscriptions: (page = 1, status?: string) =>
    api.get<Subscription[]>("/platform/subscriptions", { query: { page, status } }),

  listInvoices: (page = 1, tenantId?: string, status?: string) =>
    api.get<PlatformInvoice[]>("/platform/invoices", { query: { page, tenantId, status } }),
  createInvoice: (tenantId: string) =>
    api.post<PlatformInvoice>("/platform/invoices", { tenantId }),
  markPaid: (id: string, amount?: number) =>
    api.post<PlatformInvoice>(`/platform/invoices/${id}/mark-paid`, { amount }),

  listPlans: () => api.get<Plan[]>("/platform/plans"),
  createPlan: (body: CreatePlanInput) => api.post<Plan>("/platform/plans", body),

  listCoupons: (page = 1, isActive?: boolean) =>
    api.get<Coupon[]>("/platform/coupons", { query: { page, isActive } }),
  createCoupon: (body: CreateCouponInput) => api.post<Coupon>("/platform/coupons", body),
};
