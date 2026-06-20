import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BillingCurrency,
  BillingCycle,
  LimitEnforcement,
  LimitMetric,
  PlanTier,
  SubscriptionStatus,
} from "@prisma/client";
import { paginated } from "../common/http/api-response";
import { LifecycleService } from "../billing/lifecycle.service";
import { PrismaService } from "../prisma/prisma.service";

export interface CreatePlanInput {
  code: string;
  name: string;
  tier: PlanTier;
  description?: string;
  isPublic?: boolean;
  trialDays?: number;
  sortOrder?: number;
  prices?: { billingCycle: BillingCycle; currency?: BillingCurrency; amount: number }[];
  features?: { featureKey: string; enabled?: boolean }[];
  limits?: { metric: LimitMetric; limitValue: number | null; enforcement?: LimitEnforcement }[];
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
  ) {}

  async listTenants(page = 1, pageSize = 20, status?: string) {
    const where = status ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      this.prisma.system.tenant.findMany({
        where: { ...where, deletedAt: null },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          settings: true,
          subscription: { include: { plan: true } },
          _count: { select: { schools: true } },
        },
      }),
      this.prisma.system.tenant.count({ where: { ...where, deletedAt: null } }),
    ]);
    return paginated(items, { page, pageSize, total });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.system.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        settings: true,
        domains: true,
        schools: true,
        subscription: {
          include: { plan: true, invoices: { orderBy: { createdAt: "desc" }, take: 10 } },
        },
      },
    });
    if (!tenant)
      throw new NotFoundException({ code: "NO_TENANT", message: "Không tìm thấy tenant" });
    return tenant;
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

  listSubscriptions(page = 1, pageSize = 20, status?: string) {
    const where = status ? { status: status as never } : {};
    return this.prisma.system.subscription
      .findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      })
      .then((items) => paginated(items, { page, pageSize }));
  }

  listInvoices(page = 1, pageSize = 20, tenantId?: string, status?: string) {
    const where = {
      ...(tenantId ? { tenantId } : {}),
      ...(status ? { status: status as never } : {}),
    };
    return this.prisma.system.platformInvoice
      .findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      })
      .then((items) => paginated(items, { page, pageSize }));
  }

  // ─── Plan admin ───
  listPlans() {
    return this.prisma.system.plan.findMany({
      where: { deletedAt: null },
      include: { prices: true, features: true, limits: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  createPlan(input: CreatePlanInput) {
    return this.prisma.system.plan.create({
      data: {
        code: input.code,
        name: input.name,
        tier: input.tier,
        description: input.description,
        isPublic: input.isPublic ?? true,
        trialDays: input.trialDays ?? 0,
        sortOrder: input.sortOrder ?? 0,
        prices: input.prices ? { create: input.prices.map((p) => ({ ...p })) } : undefined,
        features: input.features ? { create: input.features.map((f) => ({ ...f })) } : undefined,
        limits: input.limits ? { create: input.limits.map((l) => ({ ...l })) } : undefined,
      },
      include: { prices: true, features: true, limits: true },
    });
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
    const created = await this.prisma.system.tenantEntitlement.create({
      data: { tenantId, subscriptionId: sub?.id, ...override },
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
