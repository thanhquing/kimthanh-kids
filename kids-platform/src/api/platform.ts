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
  isActive?: boolean;
  trialDays?: number;
  sortOrder?: number;
  tenantCount?: number;
  prices?: { billingCycle: string; currency: string; amount: number }[];
  features?: { featureKey: string; enabled: boolean }[];
  limits?: { metric: string; limitValue: number | null; enforcement: string }[];
};

export type Tenant = {
  id: string;
  slug: string;
  legalName: string;
  taxCode?: string | null;
  taxVerifiedAt?: string | null;
  status: string;
  planTier: string;
  tenancyMode?: string;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  createdAt: string;
  settings?: {
    displayName?: string | null;
    primaryColor?: string | null;
    timezone?: string | null;
    logoUrl?: string | null;
  } | null;
  subscription?: {
    status?: string;
    billingCycle?: string;
    billingMode?: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    plan?: Plan;
    invoices?: PlatformInvoice[];
  } | null;
  domains?: { domain: string; isPrimary?: boolean; verifiedAt?: string | null }[];
  schools?: {
    id: string;
    name?: string;
    code?: string;
    status?: string;
    _count?: { students?: number; classrooms?: number };
  }[];
  _count?: { schools?: number };
  // Bổ sung ở GET /platform/tenants (list) cho bảng Tenants:
  billingCycle?: string | null;
  studentCount?: number;
  mrr?: number;
  // Bổ sung ở GET /platform/tenants/:id (detail):
  quota?: { metric: string; used: number; limit: number | null; enforcement: string | null }[];
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
  tenantName?: string | null;
  tenantSlug?: string | null;
  status: string;
  billingCycle?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  autoRenew?: boolean;
  mrr?: number;
  plan?: Plan;
};

export type SubscriptionStats = {
  total: number;
  TRIALING: number;
  ACTIVE: number;
  PAST_DUE: number;
  SUSPENDED: number;
  CANCELED: number;
  EXPIRED: number;
};

export type PlatformInvoice = {
  id: string;
  invoiceNumber?: string;
  tenantId: string;
  tenantName?: string | null;
  period?: string;
  total?: number;
  amountDue?: number;
  status: string;
  dueDate?: string | null;
  lines?: { label: string; amount: number }[];
};

export type InvoiceStats = {
  paidThisMonth: number;
  openAmount: number;
  overdueAmount: number;
  total: number;
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
  taxCode: string;
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

export type UpdatePlanInput = {
  name?: string;
  description?: string;
  isPublic?: boolean;
  isActive?: boolean;
  trialDays?: number;
  sortOrder?: number;
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
    api.getPage<Subscription>("/platform/subscriptions", { query: { page, status } }),
  subscriptionStats: () => api.get<SubscriptionStats>("/platform/subscriptions/stats"),

  listInvoices: (page = 1, status?: string, q?: string) =>
    api.getPage<PlatformInvoice>("/platform/invoices", {
      query: { page, status, q: q || undefined },
    }),
  invoiceStats: () => api.get<InvoiceStats>("/platform/invoices/stats"),
  createInvoice: (tenantId: string) =>
    api.post<PlatformInvoice>("/platform/invoices", { tenantId }),
  markPaid: (id: string, amount?: number) =>
    api.post<PlatformInvoice>(`/platform/invoices/${id}/mark-paid`, { amount }),

  listPlans: () => api.get<Plan[]>("/platform/plans"),
  createPlan: (body: CreatePlanInput) => api.post<Plan>("/platform/plans", body),
  updatePlan: (id: string, body: UpdatePlanInput) =>
    api.patch<Plan>(`/platform/plans/${id}`, body),

  listCoupons: (page = 1, isActive?: boolean) =>
    api.get<Coupon[]>("/platform/coupons", { query: { page, isActive } }),
  createCoupon: (body: CreateCouponInput) => api.post<Coupon>("/platform/coupons", body),
};
