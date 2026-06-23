import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BillingCurrency,
  BillingCycle,
  CouponDuration,
  DiscountKind,
  LimitEnforcement,
  LimitMetric,
  PlanTier,
  SubscriptionStatus,
  TenantRole,
  UserType,
} from "@prisma/client";
import { TokenService } from "../auth/token.service";
import { paginated } from "../common/http/api-response";
import { LifecycleService } from "../billing/lifecycle.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProvisioningService, SignupInput } from "../provisioning/provisioning.service";

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

  async createTenant(input: PlatformCreateTenantInput, actorId: string) {
    const created = await this.provisioning.signup(input);
    await this.prisma.system.auditLog.create({
      data: {
        tenantId: created.tenant.id,
        actorId,
        actorType: UserType.PLATFORM,
        action: "platform.tenant.create",
        targetType: "Tenant",
        targetId: created.tenant.id,
      },
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
      select: { id: true, email: true, phone: true, fullName: true },
    });
    if (!admin) {
      throw new NotFoundException({
        code: "NO_TENANT_ADMIN",
        message: "Tenant chưa có chủ trường active để impersonate",
      });
    }

    await this.prisma.system.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorType: UserType.PLATFORM,
        action: "platform.tenant.impersonate",
        targetType: "User",
        targetId: admin.id,
        metadata: { tenantId },
      },
    });

    const accessToken = await this.tokens.signAccess({
      sub: admin.id,
      type: UserType.TENANT,
      tenantId,
      platformRole: null,
    });

    return {
      accessToken,
      tokenType: "Bearer",
      user: admin,
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

  listCoupons(page = 1, pageSize = 20, isActive?: string) {
    const where =
      isActive === undefined ? {} : { isActive: ["true", "1", "yes"].includes(isActive) };
    return this.prisma.system.coupon
      .findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      })
      .then((items) => paginated(items, { page, pageSize }));
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
