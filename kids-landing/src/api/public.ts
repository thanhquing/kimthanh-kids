import { api } from "./http";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "ANNUAL";

export type PublicPlan = {
  id: string;
  code: string;
  tier: string;
  name: string;
  description?: string | null;
  trialDays: number;
  sortOrder: number;
  prices: {
    billingCycle: BillingCycle;
    currency: string;
    amount: number | string;
    isActive: boolean;
  }[];
  features: { featureKey: string; enabled: boolean }[];
  limits: { metric: string; limitValue: number | null; enforcement: string }[];
};

export type PublicPostCard = {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  tags: string[];
  publishedAt?: string | null;
};

export type PublicPost = PublicPostCard & {
  contentMarkdown: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type SignupInput = {
  schoolName: string;
  slug: string;
  code?: string;
  taxCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
  planCode?: string;
  billingCycle?: BillingCycle;
};

export type SignupResult = {
  tenant: { id: string; slug: string; code?: string | null; host: string; status: string };
  school: { id: string };
  admin: { id: string; email?: string | null };
  subscription: { id: string; status: string };
  selectedPlan?: {
    code: string;
    name: string;
    tier: string;
    billingCycle: BillingCycle;
    amount: number;
  };
  upgradeInvoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    amountDue: number;
    publicToken: string;
  };
  publicInvoiceUrl?: string;
};

export type PublicInvoice = {
  invoiceNumber: string;
  status: string;
  total: number;
  amountDue: number;
  bank: { bin?: string | null; accountNumber?: string | null; accountName?: string | null };
};

export const publicApi = {
  plans: () => api.get<PublicPlan[]>("/public/plans"),
  availability: (slug: string) =>
    api.get<{ available: boolean; reason?: string }>("/public/availability", { query: { slug } }),
  signup: (body: SignupInput) => api.post<SignupResult>("/public/signup", body),
  posts: (page = 1, pageSize = 12) =>
    api.getPage<PublicPostCard>("/public/posts", { query: { page, pageSize } }),
  post: (slug: string) => api.get<PublicPost>(`/public/posts/${slug}`),
  invoice: (token: string) => api.get<PublicInvoice>(`/public/platform-invoices/${token}`),
};
