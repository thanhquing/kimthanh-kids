import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BillingCurrency,
  BillingCycle,
  CouponDuration,
  DiscountKind,
  LimitEnforcement,
  LimitMetric,
  PlanTier,
  PlatformInvoiceStatus,
  Prisma,
  StudentStatus,
  SubscriptionStatus,
  TenantRole,
  TenantStatus,
  UserType,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { TokenService } from "../auth/token.service";
import { paginated } from "../common/http/api-response";
import { LifecycleService } from "../billing/lifecycle.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  PlatformConfigService,
  UpdatePlatformConfigInput,
} from "../platform-config/platform-config.service";
import { ProvisioningService, SignupInput } from "../provisioning/provisioning.service";
import { MrrSnapshotService } from "./mrr-snapshot.service";

/** Ngưỡng cảnh báo quota (dùng cho worklist + filter trang Trường). */
const QUOTA_AT_RISK_PCT = 80;
/**
 * Metric có nguồn usage thật để cảnh báo nâng gói. KHÔNG gồm SCHOOLS: gói phổ thông chỉ cho
 * 1 cơ sở nên mọi trường đều 1/1 = 100% → nhiễu (gần như trường nào cũng "sắp chạm hạn").
 */
const QUOTA_METRICS = [LimitMetric.STUDENTS, LimitMetric.TEACHERS, LimitMetric.STORAGE_MB] as const;

export interface CreatePlanInput {
  code: string;
  name: string;
  tier: PlanTier;
  description?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  trialDays?: number;
  sortOrder?: number;
  prices?: { billingCycle: BillingCycle; currency?: BillingCurrency; amount: number }[];
  features?: { featureKey: string; enabled?: boolean }[];
  limits?: { metric: LimitMetric; limitValue: number | null; enforcement?: LimitEnforcement }[];
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  trialDays?: number;
  sortOrder?: number;
  prices?: { billingCycle: BillingCycle; currency?: BillingCurrency; amount: number }[];
  features?: { featureKey: string; enabled?: boolean }[];
  limits?: { metric: LimitMetric; limitValue: number | null; enforcement?: LimitEnforcement }[];
}

export type PlatformCreateTenantInput = SignupInput;

export interface CreateCouponInput {
  code: string;
  kind: DiscountKind;
  amount: number | string;
  currency?: BillingCurrency;
  duration?: CouponDuration;
  durationCount?: number;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly provisioning: ProvisioningService,
    private readonly tokens: TokenService,
    private readonly mrr: MrrSnapshotService,
    private readonly entitlements: EntitlementService,
    private readonly config: PlatformConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Cấu hình nền tảng (ngân hàng VietQR + grace dunning). */
  getSettings() {
    return this.config.get();
  }

  updateSettings(input: UpdatePlatformConfigInput) {
    return this.config.update(input);
  }

  /** Chuỗi doanh thu MRR theo tháng (cho biểu đồ 12/24 tháng). Giới hạn 1..24. */
  async revenue(months = 12) {
    const m = Math.min(24, Math.max(1, Math.floor(months) || 12));
    const series = await this.mrr.monthlySeries(m);
    return { months: m, series, growthPct: this.mrr.growthPct(series.map((p) => p.value)) };
  }

  /**
   * Tổng quan dashboard cho operator nền tảng (xuyên tenant). Một phát trả đủ:
   * KPI (trường/active/trial/overdue/suspended/MRR), chuỗi MRR 12 tháng, phân bổ theo gói,
   * trường mới đăng ký + hóa đơn quá hạn. Số tiền quy VND/tháng từ giá gói thật (không bịa).
   */
  async dashboard() {
    const now = new Date();

    const [tenants, activeTenants, trialTenants, suspendedTenants] = await Promise.all([
      this.prisma.system.tenant.count({ where: { deletedAt: null } }),
      this.prisma.system.tenant.count({
        where: { deletedAt: null, status: TenantStatus.ACTIVE },
      }),
      this.prisma.system.tenant.count({
        where: { deletedAt: null, status: TenantStatus.TRIAL },
      }),
      this.prisma.system.tenant.count({
        where: { deletedAt: null, status: TenantStatus.SUSPENDED },
      }),
    ]);

    // Thuê bao đang chạy → nguồn để tính MRR + phân bổ gói.
    const subs = await this.prisma.system.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: { include: { prices: true } } },
    });

    const mrr = Math.round(subs.reduce((sum, s) => sum + this.mrr.subMrr(s), 0));

    // Phân bổ theo gói: nhóm theo TIER (FREE/STARTER/PRO/ENTERPRISE/CUSTOM) — KHÔNG theo planId,
    // vì mỗi tenant CUSTOM thường là 1 plan riêng → gộp theo tier mới ra số lát hợp lý.
    const distMap = new Map<PlanTier, number>();
    for (const s of subs) {
      if (!s.plan) continue;
      distMap.set(s.plan.tier, (distMap.get(s.plan.tier) ?? 0) + 1);
    }
    const planDistribution = [...distMap.entries()]
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count);

    // MRR 12 tháng: ưu tiên snapshot thật (bất biến, không mù churn); tháng thiếu → suy ngược.
    const mrrSeries = await this.mrr.monthlySeries(12);
    const mrrGrowthPct = this.mrr.growthPct(mrrSeries.map((p) => p.value));

    // Trường mới đăng ký (5 gần nhất).
    const recentTenantsRaw = await this.prisma.system.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { settings: true, subscription: { include: { plan: true } } },
    });
    const recentTenants = recentTenantsRaw.map((t) => ({
      id: t.id,
      slug: t.slug,
      displayName: t.settings?.displayName ?? t.legalName,
      status: t.status,
      planName: t.subscription?.plan?.name ?? null,
      trialEndsAt: t.trialEndsAt,
    }));

    // Hóa đơn quá hạn = CHƯA trả & quá hạn THEO NGÀY (OPEN/OVERDUE, dueAt<now, còn nợ) —
    // KHỚP với trang "Cần hành động" (worklist), KHÔNG phụ thuộc cron markOverdue đã chạy hay chưa.
    const overdueAll = await this.prisma.system.platformInvoice.findMany({
      where: {
        status: { in: [PlatformInvoiceStatus.OPEN, PlatformInvoiceStatus.OVERDUE] },
        dueAt: { lt: now },
        deletedAt: null,
      },
      orderBy: { dueAt: "asc" },
    });
    const overdueUnpaid = overdueAll.filter((i) => Number(i.total) - Number(i.amountPaid) > 0);
    const overdueInvoiceCount = overdueUnpaid.length;
    const overdueRaw = overdueUnpaid.slice(0, 5);
    const tenantNames = new Map<string, string>();
    if (overdueRaw.length) {
      const rows = await this.prisma.system.tenant.findMany({
        where: { id: { in: [...new Set(overdueRaw.map((i) => i.tenantId))] } },
        include: { settings: true },
      });
      for (const r of rows) tenantNames.set(r.id, r.settings?.displayName ?? r.legalName);
    }
    const recentOverdue = overdueRaw.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantName: tenantNames.get(inv.tenantId) ?? null,
      amountDue: Number(inv.total) - Number(inv.amountPaid),
      dueAt: inv.dueAt,
      daysLate: inv.dueAt
        ? Math.max(0, Math.floor((now.getTime() - inv.dueAt.getTime()) / 86_400_000))
        : null,
    }));

    return {
      kpis: {
        tenants,
        activeTenants,
        trialTenants,
        overdueInvoices: overdueInvoiceCount,
        suspendedTenants,
        mrr,
      },
      mrrSeries,
      mrrGrowthPct,
      planDistribution,
      recentTenants,
      recentOverdue,
    };
  }

  async listTenants(
    page = 1,
    pageSize = 20,
    status?: string,
    q?: string,
    planTier?: string,
    quota?: string,
  ) {
    const term = q?.trim();
    const now = new Date();
    // Lọc theo cảnh báo quota: chỉ những trường sắp chạm hạn (>=80%, tính usage thật).
    const quotaIds = quota === "at-risk" ? await this.quotaRiskTenantIds(now) : undefined;
    const where = {
      ...(status ? { status: status as never } : {}),
      deletedAt: null,
      ...(quotaIds ? { id: { in: quotaIds } } : {}),
      ...(planTier ? { subscription: { is: { plan: { is: { tier: planTier as never } } } } } : {}),
      ...(term
        ? {
            OR: [
              { slug: { contains: term, mode: "insensitive" as const } },
              { legalName: { contains: term, mode: "insensitive" as const } },
              {
                settings: { is: { displayName: { contains: term, mode: "insensitive" as const } } },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.system.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          settings: true,
          subscription: {
            include: { plan: { include: { prices: true, limits: true } }, overrides: true },
          },
          _count: { select: { schools: true } },
        },
      }),
      this.prisma.system.tenant.count({ where }),
    ]);

    // Usage thật (HS/GV/Lớp/Lưu trữ) cho cả trang → cột "Hạn mức" hiển thị dùng/limit.
    const usage = await this.usageCounts(items.map((t) => t.id));
    const rows = items.map((t) => {
      const used = this.usedForTenant(usage, t.id);
      const limits = t.subscription?.plan
        ? this.resolveLimitMap(t.subscription.plan.limits, t.subscription.overrides, now)
        : new Map<LimitMetric, number | null>();
      const quota = QUOTA_METRICS.map((metric) => ({
        metric,
        used: used[metric] ?? 0,
        limit: limits.get(metric) ?? null, // null = không giới hạn
      }));
      return {
        ...t,
        planTier: t.subscription?.plan?.tier ?? null,
        billingCycle: t.subscription?.billingCycle ?? null,
        studentCount: used[LimitMetric.STUDENTS] ?? 0,
        quota,
        mrr: t.subscription ? Math.round(this.mrr.subMrr(t.subscription)) : 0,
      };
    });
    return paginated(rows, { page, pageSize, total });
  }

  /** Tìm nhanh (ô search dashboard): trường + hóa đơn nền tảng theo từ khóa. Top 5 mỗi loại. */
  async search(q?: string) {
    const term = q?.trim();
    if (!term || term.length < 1) return { tenants: [], invoices: [] };
    const ci = { contains: term, mode: "insensitive" as const };
    const [tenants, invoices] = await Promise.all([
      this.prisma.system.tenant.findMany({
        where: {
          deletedAt: null,
          OR: [{ slug: ci }, { legalName: ci }, { settings: { is: { displayName: ci } } }],
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { settings: true },
      }),
      this.prisma.system.platformInvoice.findMany({
        where: { deletedAt: null, invoiceNumber: ci },
        take: 5,
        orderBy: { issuedAt: "desc" },
      }),
    ]);
    const invTenantIds = [...new Set(invoices.map((i) => i.tenantId))];
    const tRows = invTenantIds.length
      ? await this.prisma.system.tenant.findMany({
          where: { id: { in: invTenantIds } },
          include: { settings: true },
        })
      : [];
    const tName = new Map(tRows.map((t) => [t.id, t.settings?.displayName ?? t.legalName]));
    return {
      tenants: tenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.settings?.displayName ?? t.legalName,
        status: t.status,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        tenantId: i.tenantId,
        tenantName: tName.get(i.tenantId) ?? null,
        status: i.status,
        total: Number(i.total),
      })),
    };
  }

  /** Đếm tenant theo trạng thái (cho chip lọc) — xuyên trang, không phụ thuộc phân trang. */
  async tenantStats() {
    const grouped = await this.prisma.system.tenant.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const by = (s: TenantStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;
    return {
      total: grouped.reduce((sum, g) => sum + g._count._all, 0),
      ACTIVE: by(TenantStatus.ACTIVE),
      TRIAL: by(TenantStatus.TRIAL),
      PAST_DUE: by(TenantStatus.PAST_DUE),
      SUSPENDED: by(TenantStatus.SUSPENDED),
    };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.system.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        settings: true,
        domains: true,
        schools: {
          where: { deletedAt: null },
          include: { _count: { select: { students: true, classrooms: true } } },
        },
        subscription: {
          include: {
            plan: { include: { prices: true } },
            invoices: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
      },
    });
    if (!tenant)
      throw new NotFoundException({ code: "NO_TENANT", message: "Không tìm thấy tenant" });

    // Đếm usage thật + giới hạn gói → quota cho card hạn mức.
    const [studentCount, teacherIds, storageAgg, ent] = await Promise.all([
      this.prisma.system.student.count({
        where: { tenantId: id, status: StudentStatus.ACTIVE, deletedAt: null },
      }),
      this.prisma.system.membership.findMany({
        where: { tenantId: id, role: TenantRole.TEACHER, isActive: true, deletedAt: null },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.system.media.aggregate({ where: { tenantId: id }, _sum: { sizeBytes: true } }),
      this.entitlements.resolve(id),
    ]);

    const teacherCount = teacherIds.length;
    const storageUsedMb = Math.round((storageAgg._sum.sizeBytes ?? 0) / (1024 * 1024));
    // Gói tính theo GV + HS + lưu trữ; số lớp KHÔNG còn là chiều quota (BL-049).
    const usedByMetric: Partial<Record<LimitMetric, number>> = {
      [LimitMetric.STUDENTS]: studentCount,
      [LimitMetric.TEACHERS]: teacherCount,
      [LimitMetric.SCHOOLS]: tenant.schools.length,
      [LimitMetric.STORAGE_MB]: storageUsedMb,
    };
    const quota = (
      [LimitMetric.STUDENTS, LimitMetric.TEACHERS, LimitMetric.STORAGE_MB] as const
    ).map((metric) => ({
      metric,
      used: usedByMetric[metric] ?? 0,
      limit: ent.limits[metric]?.limitValue ?? null, // null = không giới hạn
      enforcement: ent.limits[metric]?.enforcement ?? null,
    }));

    const mrr = tenant.subscription ? Math.round(this.mrr.subMrr(tenant.subscription)) : 0;

    return { ...tenant, studentCount, mrr, quota };
  }

  async createTenant(input: PlatformCreateTenantInput, actorId: string) {
    const created = await this.provisioning.signup(input);
    await this.audit.log({
      tenantId: created.tenant.id,
      actorId,
      actorType: UserType.PLATFORM,
      action: "platform.tenant.create",
      targetType: "Tenant",
      targetId: created.tenant.id,
    });
    return created;
  }

  async impersonateTenantAdmin(tenantId: string, actorId: string) {
    const tenant = await this.prisma.system.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (!tenant)
      throw new NotFoundException({ code: "NO_TENANT", message: "Không tìm thấy tenant" });

    const admin = await this.prisma.system.user.findFirst({
      where: {
        tenantId,
        type: UserType.TENANT,
        isActive: true,
        deletedAt: null,
        memberships: {
          some: {
            tenantId,
            role: TenantRole.SCHOOL_ADMIN,
            isActive: true,
            deletedAt: null,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, phone: true, fullName: true, tokenVersion: true },
    });
    if (!admin) {
      throw new NotFoundException({
        code: "NO_TENANT_ADMIN",
        message: "Tenant chưa có chủ trường active để impersonate",
      });
    }

    await this.audit.log({
      tenantId,
      actorId,
      actorType: UserType.PLATFORM,
      action: "platform.tenant.impersonate",
      targetType: "User",
      targetId: admin.id,
      metadata: { tenantId },
    });

    const accessToken = await this.tokens.signAccess({
      sub: admin.id,
      type: UserType.TENANT,
      tenantId,
      platformRole: null,
      tv: admin.tokenVersion,
    });

    return {
      accessToken,
      tokenType: "Bearer",
      // Không trả tokenVersion (counter nội bộ) ra client.
      user: { id: admin.id, email: admin.email, phone: admin.phone, fullName: admin.fullName },
      tenant,
    };
  }

  suspend(id: string) {
    return this.lifecycle.transition(id, SubscriptionStatus.SUSPENDED, { suspendedAt: new Date() });
  }

  reactivate(id: string) {
    return this.lifecycle.transition(id, SubscriptionStatus.ACTIVE, {
      pastDueSince: null,
      suspendedAt: null,
    });
  }

  async listSubscriptions(page = 1, pageSize = 20, status?: string) {
    const where = status ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      this.prisma.system.subscription.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tenant: { include: { settings: true } }, plan: { include: { prices: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.system.subscription.count({ where }),
    ]);
    const rows = items.map((s) => ({
      ...s,
      tenantName: s.tenant?.settings?.displayName ?? s.tenant?.legalName ?? s.tenant?.slug ?? null,
      tenantSlug: s.tenant?.slug ?? null,
      autoRenew: !s.cancelAtPeriodEnd, // tự gia hạn = KHÔNG hủy cuối kỳ
      mrr: Math.round(this.mrr.subMrr(s)),
    }));
    return paginated(rows, { page, pageSize, total });
  }

  /** Đếm thuê bao theo trạng thái (cho KPI + chip lọc trang Thuê bao). */
  async subscriptionStats() {
    const grouped = await this.prisma.system.subscription.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const by = (s: SubscriptionStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;
    return {
      total: grouped.reduce((sum, g) => sum + g._count._all, 0),
      TRIALING: by(SubscriptionStatus.TRIALING),
      ACTIVE: by(SubscriptionStatus.ACTIVE),
      PAST_DUE: by(SubscriptionStatus.PAST_DUE),
      SUSPENDED: by(SubscriptionStatus.SUSPENDED),
      CANCELED: by(SubscriptionStatus.CANCELED),
      EXPIRED: by(SubscriptionStatus.EXPIRED),
    };
  }

  async listInvoices(page = 1, pageSize = 20, tenantId?: string, status?: string, q?: string) {
    const term = q?.trim();
    const now = new Date();
    const UNPAID = [PlatformInvoiceStatus.OPEN, PlatformInvoiceStatus.OVERDUE];
    // "Chờ thu" = mọi HĐ chưa trả (OPEN/OVERDUE); "Quá hạn" = chưa trả + quá hạn theo NGÀY
    // (không phụ thuộc cron markOverdue) → khớp Worklist/Tổng quan. PAID/VOID lọc đúng status.
    const statusFilter: Prisma.PlatformInvoiceWhereInput =
      status === "OPEN"
        ? { status: { in: UNPAID } }
        : status === "OVERDUE"
          ? { status: { in: UNPAID }, dueAt: { lt: now } }
          : status
            ? { status: status as never }
            : {};
    const where: Prisma.PlatformInvoiceWhereInput = {
      deletedAt: null,
      ...(tenantId ? { tenantId } : {}),
      ...statusFilter,
      ...(term ? { invoiceNumber: { contains: term, mode: "insensitive" as const } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.system.platformInvoice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.system.platformInvoice.count({ where }),
    ]);

    // PlatformInvoice không có quan hệ `tenant` → tra tên trường theo tenantId (1 query).
    const tenantNames = new Map<string, string>();
    if (items.length) {
      const rows = await this.prisma.system.tenant.findMany({
        where: { id: { in: [...new Set(items.map((i) => i.tenantId))] } },
        include: { settings: true },
      });
      for (const r of rows) tenantNames.set(r.id, r.settings?.displayName ?? r.legalName);
    }

    const fmtPeriod = (d: Date) =>
      `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    const rows = items.map((inv) => ({
      ...inv,
      // Decimal → number tường minh (Prisma serialize Decimal thành string) để khớp type FE.
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total: Number(inv.total),
      amountPaid: Number(inv.amountPaid),
      lines: inv.lines.map((l) => ({
        ...l,
        unitPrice: Number(l.unitPrice),
        amount: Number(l.amount),
      })),
      tenantName: tenantNames.get(inv.tenantId) ?? null,
      period: fmtPeriod(inv.periodStart),
      dueDate: inv.dueAt, // alias cho FE
      amountDue: Number(inv.total) - Number(inv.amountPaid),
    }));
    return paginated(rows, { page, pageSize, total });
  }

  /** KPI hóa đơn nền tảng: đã thu tháng này, chờ thu, quá hạn (số tiền) + tổng số hóa đơn. */
  async invoiceStats() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const outstanding = (a: {
      _sum: { total: Prisma.Decimal | null; amountPaid: Prisma.Decimal | null };
    }) => Number(a._sum.total ?? 0) - Number(a._sum.amountPaid ?? 0);
    const UNPAID = [PlatformInvoiceStatus.OPEN, PlatformInvoiceStatus.OVERDUE];
    const [paid, open, overdue, total] = await Promise.all([
      this.prisma.system.platformInvoice.aggregate({
        _sum: { total: true },
        where: { status: PlatformInvoiceStatus.PAID, paidAt: { gte: monthStart }, deletedAt: null },
      }),
      // Chờ thu = tổng còn nợ của mọi HĐ chưa trả (OPEN/OVERDUE).
      this.prisma.system.platformInvoice.aggregate({
        _sum: { total: true, amountPaid: true },
        where: { status: { in: UNPAID }, deletedAt: null },
      }),
      // Quá hạn = phần còn nợ đã quá hạn theo ngày (subset của Chờ thu) — khớp Worklist.
      this.prisma.system.platformInvoice.aggregate({
        _sum: { total: true, amountPaid: true },
        where: { status: { in: UNPAID }, dueAt: { lt: now }, deletedAt: null },
      }),
      this.prisma.system.platformInvoice.count({ where: { deletedAt: null } }),
    ]);
    return {
      paidThisMonth: Number(paid._sum.total ?? 0),
      openAmount: outstanding(open),
      overdueAmount: outstanding(overdue),
      total,
    };
  }

  /** Chi tiết 1 hóa đơn nền tảng (cho trang chi tiết admin) — kèm dòng + bên bán + ngân hàng. */
  async getInvoiceDetail(id: string) {
    const inv = await this.prisma.system.platformInvoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        lines: { orderBy: { createdAt: "asc" } },
        subscription: { include: { plan: true } },
      },
    });
    if (!inv) {
      throw new NotFoundException({ code: "INVOICE_NOT_FOUND", message: "Không tìm thấy hóa đơn" });
    }
    return this.shapeInvoiceDoc(inv);
  }

  /** Hóa đơn qua link CÔNG KHAI (không cần đăng nhập) — token uuid khó đoán. Bỏ id/token nội bộ. */
  async getPublicInvoice(token: string) {
    const inv = await this.prisma.system.platformInvoice.findFirst({
      where: { publicToken: token, deletedAt: null },
      include: {
        lines: { orderBy: { createdAt: "asc" } },
        subscription: { include: { plan: true } },
      },
    });
    if (!inv) {
      throw new NotFoundException({ code: "INVOICE_NOT_FOUND", message: "Không tìm thấy hóa đơn" });
    }
    const doc = await this.shapeInvoiceDoc(inv);
    const { id: _id, publicToken: _t, ...pub } = doc;
    void _id;
    void _t;
    return pub;
  }

  /** Định hình hóa đơn cho trang in/chi tiết: bên bán (nền tảng) + bên mua (trường) + dòng + ngân hàng. */
  private async shapeInvoiceDoc(
    inv: Prisma.PlatformInvoiceGetPayload<{
      include: { lines: true; subscription: { include: { plan: true } } };
    }>,
  ) {
    const [tenant, cfg] = await Promise.all([
      this.prisma.system.tenant.findFirst({
        where: { id: inv.tenantId },
        include: { settings: true },
      }),
      this.config.get(),
    ]);
    const total = Number(inv.total);
    return {
      id: inv.id,
      publicToken: inv.publicToken,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      currency: inv.currency,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      paidAt: inv.paidAt,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total,
      amountPaid: Number(inv.amountPaid),
      amountDue: total - Number(inv.amountPaid),
      planName: inv.subscription?.plan?.name ?? null,
      billingCycle: inv.subscription?.billingCycle ?? null,
      lines: inv.lines.map((l) => ({
        label: l.label,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        amount: Number(l.amount),
      })),
      // Bên mua = trường thuê
      buyer: {
        name: tenant?.settings?.displayName ?? tenant?.legalName ?? "—",
        taxCode: tenant?.settings?.taxCode ?? tenant?.taxCode ?? null,
        address: tenant?.settings?.invoiceAddress ?? null,
        slug: tenant?.slug ?? null,
      },
      // Bên bán = nền tảng (cố định) + tài khoản nhận tiền (cấu hình)
      seller: { name: "KimThanh Kids", note: "Phần mềm quản lý trường mầm non" },
      bank: {
        bin: cfg.bankBin,
        accountNumber: cfg.bankAccountNumber,
        accountName: cfg.bankAccountName,
      },
    };
  }

  // ─── Plan admin ───
  /** Số tenant ĐANG dùng mỗi gói (subscription chưa hủy/hết hạn) — cho thẻ "X trường đang dùng". */
  async listPlans() {
    const plans = await this.prisma.system.plan.findMany({
      where: { deletedAt: null },
      include: { prices: true, features: true, limits: true },
      orderBy: { sortOrder: "asc" },
    });
    const counts = await this.prisma.system.subscription.groupBy({
      by: ["planId"],
      where: {
        status: {
          in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
      },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.planId, c._count._all]));
    return plans.map((p) => ({ ...p, tenantCount: countMap.get(p.id) ?? 0 }));
  }

  async createPlan(input: CreatePlanInput) {
    // Gói mới (kể cả phiên bản giá mới) mặc định CHƯA đại diện; admin dùng setPlanFeatured để lên landing.
    const plan = await this.prisma.system.plan.create({
      data: {
        code: input.code,
        name: input.name,
        tier: input.tier,
        description: input.description,
        isPublic: input.isPublic ?? true,
        isFeatured: false,
        trialDays: input.trialDays ?? 0,
        sortOrder: input.sortOrder ?? 0,
        prices: input.prices ? { create: input.prices.map((p) => ({ ...p })) } : undefined,
        features: input.features ? { create: input.features.map((f) => ({ ...f })) } : undefined,
        limits: input.limits ? { create: input.limits.map((l) => ({ ...l })) } : undefined,
      },
      include: { prices: true, features: true, limits: true },
    });
    if (input.isFeatured) await this.setPlanFeatured(plan.id);
    return this.prisma.system.plan.findFirst({
      where: { id: plan.id },
      include: { prices: true, features: true, limits: true },
    });
  }

  /** Số thuê bao (mọi trạng thái) đang tham chiếu gói — "gói đã bán" thì bất biến giá/feature/limit. */
  private planSubscriptionCount(planId: string) {
    return this.prisma.system.subscription.count({ where: { planId } });
  }

  /**
   * Sửa gói: cập nhật field vô hướng + upsert giá/feature/limit (theo unique key).
   * KHÔNG đổi tier/code (định danh gói). BẤT BIẾN (BL-050): gói đã có subscription thì KHÔNG cho
   * đổi giá/feature/limit — muốn đổi giá phải tạo phiên bản gói mới (createPlan) rồi setPlanFeatured.
   * Thuê bao đang chạy giữ nguyên tới kỳ kế (giá khóa ở subscription).
   */
  async updatePlan(id: string, input: UpdatePlanInput) {
    const plan = await this.prisma.system.plan.findFirst({
      where: { id, deletedAt: null },
      include: { prices: true, features: true, limits: true },
    });
    if (!plan) {
      throw new NotFoundException({
        code: "PLAN_NOT_FOUND",
        message: "Không tìm thấy gói dịch vụ",
      });
    }
    // BẤT BIẾN (BL-050): gói đã có thuê bao thì KHÔNG cho ĐỔI giá/feature/limit. Gửi lại y hệt giá trị
    // hiện tại (no-op) VẪN được — để UI sửa tên/trial/public không bị chặn oan dù có kèm prices.
    const priceChanged = (input.prices ?? []).some((p) => {
      const cur = plan.prices.find(
        (x) =>
          x.billingCycle === p.billingCycle && x.currency === (p.currency ?? BillingCurrency.VND),
      );
      return !cur || Number(cur.amount) !== Number(p.amount);
    });
    const featureChanged = (input.features ?? []).some((f) => {
      const cur = plan.features.find((x) => x.featureKey === f.featureKey);
      return !cur || cur.enabled !== (f.enabled ?? true);
    });
    const limitChanged = (input.limits ?? []).some((l) => {
      const cur = plan.limits.find((x) => x.metric === l.metric);
      return (
        !cur ||
        cur.limitValue !== l.limitValue ||
        (l.enforcement != null && cur.enforcement !== l.enforcement)
      );
    });
    if (
      (priceChanged || featureChanged || limitChanged) &&
      (await this.planSubscriptionCount(id)) > 0
    ) {
      throw new BadRequestException({
        code: "PLAN_IMMUTABLE",
        message:
          "Gói đã có thuê bao — không sửa được giá/tính năng/hạn mức. Hãy tạo phiên bản gói mới rồi đặt làm gói đại diện.",
      });
    }
    // Ẩn/ngừng bán gói đang đại diện → tự bỏ featured để tier không mất/nhầm gói đại diện (BL-050).
    const clearFeatured = input.isActive === false || input.isPublic === false;
    await this.prisma.system.plan.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        isPublic: input.isPublic ?? undefined,
        isActive: input.isActive ?? undefined,
        ...(clearFeatured ? { isFeatured: false } : {}),
        trialDays: input.trialDays ?? undefined,
        sortOrder: input.sortOrder ?? undefined,
      },
    });
    if (input.isFeatured === true && !clearFeatured) await this.setPlanFeatured(id);
    else if (input.isFeatured === false)
      await this.prisma.system.plan.update({ where: { id }, data: { isFeatured: false } });
    for (const p of input.prices ?? []) {
      const currency = p.currency ?? BillingCurrency.VND;
      await this.prisma.system.planPrice.upsert({
        where: {
          planId_billingCycle_currency: { planId: id, billingCycle: p.billingCycle, currency },
        },
        update: { amount: p.amount },
        create: { planId: id, billingCycle: p.billingCycle, currency, amount: p.amount },
      });
    }
    for (const f of input.features ?? []) {
      await this.prisma.system.planFeature.upsert({
        where: { planId_featureKey: { planId: id, featureKey: f.featureKey } },
        update: { enabled: f.enabled ?? true },
        create: { planId: id, featureKey: f.featureKey, enabled: f.enabled ?? true },
      });
    }
    for (const l of input.limits ?? []) {
      await this.prisma.system.planLimit.upsert({
        where: { planId_metric: { planId: id, metric: l.metric } },
        update: { limitValue: l.limitValue, enforcement: l.enforcement ?? undefined },
        create: {
          planId: id,
          metric: l.metric,
          limitValue: l.limitValue,
          enforcement: l.enforcement ?? LimitEnforcement.HARD,
        },
      });
    }
    return this.prisma.system.plan.findFirst({
      where: { id },
      include: { prices: true, features: true, limits: true },
    });
  }

  /**
   * Đặt gói làm ĐẠI DIỆN (featured) cho tier của nó — landing hiển thị đúng 1 gói/tier (BL-050).
   * Bỏ featured của các gói cùng tier trong cùng transaction. Gói phải active + public.
   */
  async setPlanFeatured(id: string) {
    const plan = await this.prisma.system.plan.findFirst({ where: { id, deletedAt: null } });
    if (!plan)
      throw new NotFoundException({
        code: "PLAN_NOT_FOUND",
        message: "Không tìm thấy gói dịch vụ",
      });
    if (!plan.isActive || !plan.isPublic) {
      throw new BadRequestException({
        code: "PLAN_NOT_SELLABLE",
        message: "Chỉ gói đang bán (active + public) mới được đặt làm gói đại diện",
      });
    }
    await this.prisma.system.$transaction([
      this.prisma.system.plan.updateMany({
        where: { tier: plan.tier, isFeatured: true, id: { not: id } },
        data: { isFeatured: false },
      }),
      this.prisma.system.plan.update({ where: { id }, data: { isFeatured: true } }),
    ]);
    return this.prisma.system.plan.findFirst({
      where: { id },
      include: { prices: true, features: true, limits: true },
    });
  }

  /** Ngừng bán gói (isActive=false) — gói không còn hiển thị landing, cũng bỏ đại diện. */
  async deactivatePlan(id: string) {
    const plan = await this.prisma.system.plan.findFirst({ where: { id, deletedAt: null } });
    if (!plan)
      throw new NotFoundException({
        code: "PLAN_NOT_FOUND",
        message: "Không tìm thấy gói dịch vụ",
      });
    return this.prisma.system.plan.update({
      where: { id },
      data: { isActive: false, isFeatured: false },
      include: { prices: true, features: true, limits: true },
    });
  }

  /** Soft-delete gói. KHÔNG cho xoá nếu còn thuê bao tham chiếu (giữ lịch sử giá đã bán). */
  async deletePlan(id: string) {
    const plan = await this.prisma.system.plan.findFirst({ where: { id, deletedAt: null } });
    if (!plan)
      throw new NotFoundException({
        code: "PLAN_NOT_FOUND",
        message: "Không tìm thấy gói dịch vụ",
      });
    if ((await this.planSubscriptionCount(id)) > 0) {
      throw new BadRequestException({
        code: "PLAN_HAS_SUBSCRIPTIONS",
        message: "Gói còn thuê bao tham chiếu — chỉ ngừng bán (deactivate), không xoá được.",
      });
    }
    await this.prisma.system.plan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, isFeatured: false },
    });
    return { ok: true };
  }

  async listCoupons(page = 1, pageSize = 20, isActive?: string) {
    const where =
      isActive === undefined ? {} : { isActive: ["true", "1", "yes"].includes(isActive) };
    const [items, total] = await Promise.all([
      this.prisma.system.coupon.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.system.coupon.count({ where }),
    ]);
    return paginated(items, { page, pageSize, total });
  }

  createCoupon(input: CreateCouponInput) {
    const code = input.code?.trim().toUpperCase();
    const amount = Number(input.amount);
    if (!code) {
      throw new BadRequestException({ code: "VALIDATION_FAILED", message: "Thiếu mã coupon" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Giá trị giảm giá phải lớn hơn 0",
      });
    }
    if (input.kind === DiscountKind.PERCENT && amount > 100) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Coupon phần trăm không được vượt quá 100",
      });
    }
    const validFrom = input.validFrom ? new Date(input.validFrom) : undefined;
    const validUntil = input.validUntil ? new Date(input.validUntil) : undefined;
    if (validFrom && validUntil && validUntil < validFrom) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Ngày hết hạn phải sau ngày bắt đầu",
      });
    }

    return this.prisma.system.coupon.create({
      data: {
        code,
        kind: input.kind,
        amount,
        currency: input.currency,
        duration: input.duration ?? CouponDuration.ONCE,
        durationCount: input.durationCount,
        maxRedemptions: input.maxRedemptions,
        validFrom,
        validUntil,
        isActive: input.isActive ?? true,
      },
    });
  }

  /**
   * Nhật ký hành động nhạy cảm xuyên tenant (cho trang Theo dõi vận hành / xử lý sự cố).
   * Resolve `tenantName` + `actorName/actorEmail` để bảng đọc được ngay (không phải tra ID).
   * `action` lọc kiểu contains (vd "invoice" khớp invoice.void/invoice.create...).
   */
  async listAudit(page = 1, pageSize = 30, tenantId?: string, action?: string) {
    const where = {
      ...(tenantId ? { tenantId } : {}),
      ...(action ? { action: { contains: action.trim(), mode: "insensitive" as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.system.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.system.auditLog.count({ where }),
    ]);

    const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter(Boolean))] as string[];
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
    const [tenants, actors] = await Promise.all([
      tenantIds.length
        ? this.prisma.system.tenant.findMany({
            where: { id: { in: tenantIds }, deletedAt: null },
            include: { settings: true },
          })
        : Promise.resolve([]),
      actorIds.length
        ? this.prisma.system.user.findMany({
            where: { id: { in: actorIds }, deletedAt: null },
            select: { id: true, fullName: true, email: true },
          })
        : Promise.resolve([]),
    ]);
    const tenantName = new Map(tenants.map((t) => [t.id, t.settings?.displayName ?? t.legalName]));
    const actorMap = new Map(actors.map((u) => [u.id, u]));

    const items = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      actorType: r.actorType,
      actorId: r.actorId,
      actorName: r.actorId ? (actorMap.get(r.actorId)?.fullName ?? null) : null,
      actorEmail: r.actorId ? (actorMap.get(r.actorId)?.email ?? null) : null,
      tenantId: r.tenantId,
      tenantName: r.tenantId ? (tenantName.get(r.tenantId) ?? null) : null,
      targetType: r.targetType,
      targetId: r.targetId,
      ip: r.ip,
    }));
    return paginated(items, { page, pageSize, total });
  }

  /**
   * Worklist "Cần hành động" cho operator — gộp 2 nguồn rò rỉ doanh thu:
   *  • Phễu dùng thử: trial đang chạy + sắp hết hạn + tỷ lệ chuyển đổi (trial kết thúc mà KHÔNG thành EXPIRED).
   *  • Công nợ: hóa đơn CHƯA trả & quá hạn (OPEN/OVERDUE, còn nợ) — không phụ thuộc cron đã chạy hay chưa.
   * Tận dụng engine dunning sẵn có (billing-jobs) — đây chỉ là lớp HIỂN THỊ để chủ động xử lý.
   */
  async worklist() {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 86_400_000);

    // ── Phễu dùng thử (+ quota chạy song song trong cùng Promise.all để không tạo promise lửng) ──
    const [trialSubs, endedTotal, expiredEnded, atRiskSuspend, suspendedCount, quota] =
      await Promise.all([
        this.prisma.system.subscription.findMany({
          where: { status: SubscriptionStatus.TRIALING, trialEndsAt: { not: null } },
          orderBy: { trialEndsAt: "asc" },
          take: 50,
          include: { plan: { select: { name: true } } },
        }),
        this.prisma.system.subscription.count({ where: { trialEndsAt: { not: null, lte: now } } }),
        this.prisma.system.subscription.count({
          where: { trialEndsAt: { not: null, lte: now }, status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.system.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
        this.prisma.system.subscription.count({ where: { status: SubscriptionStatus.SUSPENDED } }),
        this.quotaRisks(now),
      ]);
    const converted = endedTotal - expiredEnded;
    const conversionRate = endedTotal ? Math.round((converted / endedTotal) * 100) : 0;
    const expiringSoon = trialSubs.filter((s) => s.trialEndsAt && s.trialEndsAt <= soon).length;

    // ── Công nợ: hóa đơn chưa trả & quá hạn ──
    const rawInvoices = await this.prisma.system.platformInvoice.findMany({
      where: {
        status: { in: [PlatformInvoiceStatus.OPEN, PlatformInvoiceStatus.OVERDUE] },
        dueAt: { lt: now },
        deletedAt: null,
      },
      orderBy: { dueAt: "asc" },
      take: 50,
    });
    const dueInvoices = rawInvoices.filter((inv) => Number(inv.total) - Number(inv.amountPaid) > 0);

    // Resolve tên trường (cho cả 2 phần) + trạng thái sub (cho công nợ) — batch, không N+1.
    const tenantIds = [
      ...new Set([...trialSubs.map((s) => s.tenantId), ...dueInvoices.map((i) => i.tenantId)]),
    ];
    const dunningTenantIds = [...new Set(dueInvoices.map((i) => i.tenantId))];
    const [tenants, dunningSubs] = await Promise.all([
      tenantIds.length
        ? this.prisma.system.tenant.findMany({
            where: { id: { in: tenantIds } },
            include: { settings: true },
          })
        : Promise.resolve([]),
      dunningTenantIds.length
        ? this.prisma.system.subscription.findMany({
            where: { tenantId: { in: dunningTenantIds } },
            select: { tenantId: true, status: true },
          })
        : Promise.resolve([]),
    ]);
    const tenantName = new Map(tenants.map((t) => [t.id, t.settings?.displayName ?? t.legalName]));
    const subStatus = new Map(dunningSubs.map((s) => [s.tenantId, s.status]));

    const trialItems = trialSubs.map((s) => ({
      tenantId: s.tenantId,
      tenantName: tenantName.get(s.tenantId) ?? null,
      planName: s.plan?.name ?? null,
      trialEndsAt: s.trialEndsAt,
      daysLeft: s.trialEndsAt
        ? Math.ceil((s.trialEndsAt.getTime() - now.getTime()) / 86_400_000)
        : null,
    }));

    const dunningItems = dueInvoices.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantId: inv.tenantId,
      tenantName: tenantName.get(inv.tenantId) ?? null,
      amountDue: Number(inv.total) - Number(inv.amountPaid),
      dueAt: inv.dueAt,
      daysLate: inv.dueAt ? Math.floor((now.getTime() - inv.dueAt.getTime()) / 86_400_000) : null,
      subStatus: subStatus.get(inv.tenantId) ?? null,
    }));
    const overdueAmount = dunningItems.reduce((sum, i) => sum + i.amountDue, 0);

    return {
      trial: {
        active: trialSubs.length,
        expiringSoon,
        endedTotal,
        converted,
        conversionRate,
        items: trialItems,
      },
      dunning: {
        overdueCount: dunningItems.length,
        overdueAmount,
        atRiskSuspend,
        suspended: suspendedCount,
        items: dunningItems,
      },
      quota,
    };
  }

  /**
   * KPI cảnh báo quota cho worklist (không kèm danh sách — payload nhẹ).
   *  • atRisk  = số dòng (tenant×metric) dùng >= 80% hạn mức hữu hạn.
   *  • tenants = số TRƯỜNG (distinct) sắp chạm hạn (= cơ hội nâng gói).
   * Bấm KPI ở FE → trang Trường lọc `quota=at-risk`.
   */
  private async quotaRisks(now: Date) {
    const lines = await this.quotaLines(now);
    return {
      thresholdPct: QUOTA_AT_RISK_PCT,
      atRisk: lines.length,
      tenants: new Set(lines.map((l) => l.tenantId)).size,
    };
  }

  /**
   * Các dòng (tenant×metric) đang dùng >= 80% hạn mức hữu hạn, theo usage THẬT
   * (HS/GV/Lớp/Lưu trữ) — không qua UsageCounter cache. Dùng chung cho worklist + filter trang Trường.
   */
  private async quotaLines(now: Date): Promise<{ tenantId: string; percent: number }[]> {
    const tenants = await this.prisma.system.tenant.findMany({
      where: {
        deletedAt: null,
        status: { in: [TenantStatus.TRIAL, TenantStatus.ACTIVE, TenantStatus.PAST_DUE] },
      },
      include: {
        subscription: { include: { plan: { include: { limits: true } }, overrides: true } },
      },
    });
    if (!tenants.length) return [];

    const usage = await this.usageCounts(tenants.map((t) => t.id));
    const lines: { tenantId: string; percent: number }[] = [];
    for (const tenant of tenants) {
      const sub = tenant.subscription;
      if (!sub?.plan) continue;
      const limits = this.resolveLimitMap(sub.plan.limits, sub.overrides, now);
      const used = this.usedForTenant(usage, tenant.id);
      for (const metric of QUOTA_METRICS) {
        const limitValue = limits.get(metric);
        if (limitValue === undefined || limitValue === null || limitValue <= 0) continue;
        const percent = Math.round(((used[metric] ?? 0) / limitValue) * 100);
        if (percent >= QUOTA_AT_RISK_PCT) lines.push({ tenantId: tenant.id, percent });
      }
    }
    return lines;
  }

  /** Tập tenantId đang sắp chạm hạn (>=80%) — cho filter trang Trường. */
  private async quotaRiskTenantIds(now: Date): Promise<string[]> {
    const lines = await this.quotaLines(now);
    return [...new Set(lines.map((l) => l.tenantId))];
  }

  /** Đếm usage THẬT theo tenant cho các metric quota (HS/GV/Lưu trữ MB). Số lớp KHÔNG tính (BL-049). */
  private async usageCounts(tenantIds: string[]): Promise<{
    students: Map<string, number>;
    teachers: Map<string, number>;
    storageMb: Map<string, number>;
  }> {
    if (!tenantIds.length)
      return {
        students: new Map(),
        teachers: new Map(),
        storageMb: new Map(),
      };

    const [students, teachers, storage] = await Promise.all([
      this.prisma.system.student.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: tenantIds }, status: StudentStatus.ACTIVE, deletedAt: null },
        _count: { _all: true },
      }),
      // 1 GV dạy nhiều cơ sở sinh nhiều dòng membership (@@unique[userId,role,schoolId]) nên
      // dedup theo (tenant,user). Prisma groupBy không có COUNT(DISTINCT) và repo cấm raw query
      // (guardrail cross-tenant) → distinct findMany là phương án Prisma-native chuẩn ở đây.
      this.prisma.system.membership.findMany({
        where: {
          tenantId: { in: tenantIds },
          role: TenantRole.TEACHER,
          isActive: true,
          deletedAt: null,
        },
        distinct: ["tenantId", "userId"],
        select: { tenantId: true, userId: true },
      }),
      this.prisma.system.media.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: tenantIds } },
        _sum: { sizeBytes: true },
      }),
    ]);

    const countMap = (rows: { tenantId: string; _count: { _all: number } }[]) =>
      new Map(rows.map((r) => [r.tenantId, r._count._all]));
    const teacherCount = new Map<string, number>();
    for (const row of teachers)
      teacherCount.set(row.tenantId, (teacherCount.get(row.tenantId) ?? 0) + 1);
    return {
      students: countMap(students),
      teachers: teacherCount,
      storageMb: new Map(
        storage.map((r) => [r.tenantId, Math.round((r._sum.sizeBytes ?? 0) / (1024 * 1024))]),
      ),
    };
  }

  /** Usage các metric quota (GV + HS + lưu trữ) của 1 tenant từ kết quả `usageCounts`. */
  private usedForTenant(
    usage: Awaited<ReturnType<PlatformService["usageCounts"]>>,
    tenantId: string,
  ): Partial<Record<LimitMetric, number>> {
    return {
      [LimitMetric.STUDENTS]: usage.students.get(tenantId) ?? 0,
      [LimitMetric.TEACHERS]: usage.teachers.get(tenantId) ?? 0,
      [LimitMetric.STORAGE_MB]: usage.storageMb.get(tenantId) ?? 0,
    };
  }

  /** Resolve limit hữu hạn theo metric từ plan + override TenantEntitlement (giống EntitlementService). */
  private resolveLimitMap(
    planLimits: { metric: LimitMetric; limitValue: number | null }[],
    overrides: { metric: LimitMetric | null; limitValue: number | null; expiresAt: Date | null }[],
    now: Date,
  ): Map<LimitMetric, number | null> {
    const limits = new Map<LimitMetric, number | null>();
    for (const l of planLimits) limits.set(l.metric, l.limitValue);
    for (const o of overrides) {
      if (o.expiresAt && o.expiresAt < now) continue;
      if (!o.metric) continue;
      limits.set(o.metric, o.limitValue ?? null);
    }
    return limits;
  }

  /** Override entitlement cho tenant (vd dedicated nâng riêng limit/feature). */
  async setEntitlementOverride(
    tenantId: string,
    override: {
      featureKey?: string;
      enabled?: boolean;
      metric?: LimitMetric;
      limitValue?: number | null;
      reason?: string;
    },
  ) {
    const sub = await this.prisma.system.subscription.findUnique({ where: { tenantId } });
    // Pick tường minh (không spread `...override`) → chặn mass-assignment field lạ vào create.
    const created = await this.prisma.system.tenantEntitlement.create({
      data: {
        tenantId,
        subscriptionId: sub?.id,
        featureKey: override.featureKey,
        enabled: override.enabled,
        metric: override.metric,
        limitValue: override.limitValue,
        reason: override.reason,
      },
    });
    // Xóa cache để lần resolve sau tính lại.
    if (sub)
      await this.prisma.system.subscription.update({
        where: { tenantId },
        data: { entitlementsCache: undefined },
      });
    return created;
  }
}
