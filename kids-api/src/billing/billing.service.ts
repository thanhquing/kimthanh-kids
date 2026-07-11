import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BillingCurrency,
  BillingCycle,
  PlatformInvoiceStatus,
  Prisma,
  SubscriptionChangeType,
  SubscriptionStatus,
} from "@prisma/client";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";
import { LifecycleService } from "./lifecycle.service";

const CYCLE_DAYS: Record<BillingCycle, number> = { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly entitlements: EntitlementService,
  ) {}

  listPublicPlans() {
    // Landing chỉ hiển thị gói ĐẠI DIỆN (featured) của mỗi tier — 1 gói/tier (BL-050).
    return this.prisma.system.plan.findMany({
      where: { isPublic: true, isActive: true, isFeatured: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        tier: true,
        name: true,
        description: true,
        trialDays: true,
        sortOrder: true,
        prices: {
          where: { isActive: true },
          select: { billingCycle: true, currency: true, amount: true, isActive: true },
        },
        features: { select: { featureKey: true, enabled: true } },
        limits: { select: { metric: true, limitValue: true, enforcement: true } },
      },
    });
  }

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.system.subscription.findUnique({
      where: { tenantId },
      include: { plan: { include: { prices: true, features: true, limits: true } } },
    });
    if (!sub)
      throw new NotFoundException({ code: "NO_SUBSCRIPTION", message: "Tenant chưa có thuê bao" });
    const [entitlements, usage] = await Promise.all([
      this.entitlements.resolve(tenantId),
      this.entitlements.getUsage(tenantId),
    ]);
    return { subscription: sub, entitlements, usage };
  }

  /** Đổi gói. MVP: chuyển gói ngay, KHÔNG proration (áp giá mới từ kỳ kế tiếp). */
  async changePlan(tenantId: string, planId: string, billingCycle: BillingCycle, actorId?: string) {
    const sub = await this.prisma.system.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException({ code: "NO_SUBSCRIPTION", message: "Chưa có thuê bao" });
    // Gói trả phí chỉ đổi sang bản ĐANG BÁN (featured); Free là entry/safety-net → luôn cho về
    // (không cho nhảy về bản giá cũ, nhưng không khoá đường downgrade Free — BL-050).
    const plan = await this.prisma.system.plan.findFirst({
      where: { id: planId, isActive: true, isPublic: true, deletedAt: null },
    });
    if (!plan) throw new BadRequestException({ code: "INVALID_PLAN", message: "Gói không hợp lệ" });
    if (plan.tier !== "FREE" && !plan.isFeatured)
      throw new BadRequestException({ code: "INVALID_PLAN", message: "Gói không còn được bán" });
    const currentPlan = await this.prisma.system.plan.findUnique({ where: { id: sub.planId } });

    const rank = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3, CUSTOM: 4 } as const;
    const type =
      rank[plan.tier] >= rank[currentPlan?.tier ?? "FREE"]
        ? SubscriptionChangeType.UPGRADE
        : SubscriptionChangeType.DOWNGRADE;

    await this.prisma.system.$transaction([
      this.prisma.system.subscription.update({
        where: { tenantId },
        data: { planId, billingCycle, entitlementsCache: Prisma.DbNull },
      }),
      this.prisma.system.subscriptionChange.create({
        data: {
          subscriptionId: sub.id,
          type,
          fromPlanId: sub.planId,
          toPlanId: planId,
          fromCycle: sub.billingCycle,
          toCycle: billingCycle,
          effectiveAt: new Date(),
          actorId,
        },
      }),
    ]);
    await this.lifecycle.syncTenantCache(tenantId);
    return this.getSubscription(tenantId);
  }

  async cancel(tenantId: string, atPeriodEnd: boolean, actorId?: string) {
    const sub = await this.prisma.system.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException({ code: "NO_SUBSCRIPTION", message: "Chưa có thuê bao" });
    if (atPeriodEnd) {
      await this.prisma.system.subscription.update({
        where: { tenantId },
        data: { cancelAtPeriodEnd: true },
      });
    } else {
      await this.lifecycle.transition(tenantId, SubscriptionStatus.CANCELED, {
        canceledAt: new Date(),
        endedAt: new Date(),
      });
    }
    await this.prisma.system.subscriptionChange.create({
      data: {
        subscriptionId: sub.id,
        type: SubscriptionChangeType.CANCEL,
        effectiveAt: new Date(),
        actorId,
      },
    });
    return this.getSubscription(tenantId);
  }

  /** Tạo hóa đơn cho kỳ hiện tại từ PlanPrice (OPEN). */
  async createPeriodInvoice(tenantId: string) {
    const sub = await this.prisma.system.subscription.findUnique({
      where: { tenantId },
      include: { plan: true, tenant: true },
    });
    if (!sub) throw new NotFoundException({ code: "NO_SUBSCRIPTION", message: "Chưa có thuê bao" });

    // Versioning (BL-050): khi tạo hóa đơn kỳ mới, nếu tier của thuê bao có gói ĐẠI DIỆN (featured)
    // mới hơn gói đang gắn → chuyển subscription sang gói mới và tính theo giá mới. Hóa đơn/kỳ cũ
    // KHÔNG bị đụng (bất biến giá đã bán); giá mới chỉ áp cho hóa đơn kỳ này trở đi.
    let billingPlan = sub.plan;
    const featured = await this.prisma.system.plan.findFirst({
      where: {
        tier: sub.plan.tier,
        isFeatured: true,
        isActive: true,
        isPublic: true,
        deletedAt: null,
      },
    });
    if (featured && featured.id !== sub.planId) {
      const featuredPrice = await this.prisma.system.planPrice.findUnique({
        where: {
          planId_billingCycle_currency: {
            planId: featured.id,
            billingCycle: sub.billingCycle,
            currency: sub.currency,
          },
        },
      });
      // Chỉ migrate nếu gói đại diện mới có giá cho đúng chu kỳ; nếu thiếu, giữ nguyên gói cũ.
      if (featuredPrice) {
        await this.prisma.system.$transaction([
          this.prisma.system.subscription.update({
            where: { tenantId },
            data: { planId: featured.id, entitlementsCache: Prisma.DbNull },
          }),
          this.prisma.system.subscriptionChange.create({
            data: {
              subscriptionId: sub.id,
              type: SubscriptionChangeType.RENEW,
              fromPlanId: sub.planId,
              toPlanId: featured.id,
              fromCycle: sub.billingCycle,
              toCycle: sub.billingCycle,
              effectiveAt: new Date(),
              reason: "plan_version_migrate",
              metadata: { fromPlanCode: sub.plan.code, toPlanCode: featured.code },
            },
          }),
        ]);
        billingPlan = featured;
      }
    }

    const price = await this.prisma.system.planPrice.findUnique({
      where: {
        planId_billingCycle_currency: {
          planId: billingPlan.id,
          billingCycle: sub.billingCycle,
          currency: sub.currency,
        },
      },
    });
    if (!price)
      throw new BadRequestException({
        code: "NO_PRICE",
        message: "Gói chưa có giá cho chu kỳ này",
      });

    const amount = price.amount;
    const issuedAt = new Date();
    const invoiceNumber = await this.nextInvoiceNumber(sub.tenant.slug, billingPlan.code, issuedAt);
    return this.prisma.system.platformInvoice.create({
      data: {
        invoiceNumber,
        tenantId,
        subscriptionId: sub.id,
        status: PlatformInvoiceStatus.OPEN,
        currency: sub.currency,
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        subtotal: amount,
        total: amount,
        issuedAt,
        dueAt: new Date(issuedAt.getTime() + 7 * 86_400_000),
        lines: {
          create: {
            kind: "SUBSCRIPTION",
            label: `${billingPlan.name} — ${sub.billingCycle}`,
            quantity: 1,
            unitPrice: amount,
            amount,
          },
        },
      },
      include: { lines: true },
    });
  }

  /** Tạo hóa đơn nâng cấp sau signup: tenant vẫn đang dùng Free cho tới khi invoice PAID. */
  async createSignupUpgradeInvoice(tenantId: string, planCode: string, billingCycle: BillingCycle) {
    const sub = await this.prisma.system.subscription.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });
    if (!sub) throw new NotFoundException({ code: "NO_SUBSCRIPTION", message: "Chưa có thuê bao" });

    const plan = await this.prisma.system.plan.findFirst({
      // Chỉ nâng cấp sang gói ĐANG BÁN (featured) — chặn mua bản giá cũ qua code (BL-050).
      where: { code: planCode, isPublic: true, isActive: true, isFeatured: true, deletedAt: null },
    });
    if (!plan) throw new BadRequestException({ code: "INVALID_PLAN", message: "Gói không hợp lệ" });
    if (plan.code === "free") {
      throw new BadRequestException({
        code: "FREE_PLAN",
        message: "Gói Free không cần hóa đơn nâng cấp",
      });
    }

    const price = await this.prisma.system.planPrice.findUnique({
      where: {
        planId_billingCycle_currency: {
          planId: plan.id,
          billingCycle,
          currency: BillingCurrency.VND,
        },
      },
    });
    if (!price || !price.isActive || Number(price.amount) <= 0) {
      throw new BadRequestException({
        code: "NO_PUBLIC_PRICE",
        message: "Gói này cần liên hệ tư vấn để báo giá",
      });
    }

    const issuedAt = new Date();
    const amount = price.amount;
    const periodStart = issuedAt;
    const periodEnd = new Date(issuedAt.getTime() + CYCLE_DAYS[billingCycle] * 86_400_000);
    const invoiceNumber = await this.nextInvoiceNumber(sub.tenant.slug, plan.code, issuedAt);
    return this.prisma.system.platformInvoice.create({
      data: {
        invoiceNumber,
        tenantId,
        subscriptionId: sub.id,
        status: PlatformInvoiceStatus.OPEN,
        currency: BillingCurrency.VND,
        periodStart,
        periodEnd,
        subtotal: amount,
        total: amount,
        issuedAt,
        dueAt: new Date(issuedAt.getTime() + 7 * 86_400_000),
        metadata: {
          type: "SIGNUP_UPGRADE",
          targetPlanId: plan.id,
          targetPlanCode: plan.code,
          targetBillingCycle: billingCycle,
        },
        lines: {
          create: {
            kind: "SUBSCRIPTION",
            label: `${plan.name} — ${billingCycle}`,
            quantity: 1,
            unitPrice: amount,
            amount,
            metadata: { targetPlanCode: plan.code, targetBillingCycle: billingCycle },
          },
        },
      },
      include: { lines: true },
    });
  }

  /** Đánh dấu hóa đơn đã thanh toán → reactivate + đẩy kỳ nếu là renew. Dùng bởi manual & webhook. */
  async markInvoicePaid(invoiceId: string, paidAmount: Prisma.Decimal | number) {
    const invoice = await this.prisma.system.platformInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice)
      throw new NotFoundException({ code: "NO_INVOICE", message: "Không tìm thấy hóa đơn" });
    if (invoice.status === "PAID") return invoice;

    // "Đánh dấu đã thu" thủ công (không truyền số tiền) = trả ĐỦ → amountPaid = total
    // (tránh trạng thái PAID nhưng amountDue vẫn > 0). Có truyền amount thì dùng đúng số đó.
    const paid = Number(paidAmount) > 0 ? paidAmount : invoice.total;
    const paidData = {
      status: PlatformInvoiceStatus.PAID,
      amountPaid: paid,
      paidAt: new Date(),
    };

    const metadata =
      invoice.metadata && typeof invoice.metadata === "object" && !Array.isArray(invoice.metadata)
        ? (invoice.metadata as Record<string, unknown>)
        : {};
    const isSignupUpgrade = metadata.type === "SIGNUP_UPGRADE";

    // Signup upgrade: chỉ khi đã thu mới đổi từ Free sang gói đã chọn và reset kỳ tính phí.
    if (isSignupUpgrade) {
      const targetPlanId = typeof metadata.targetPlanId === "string" ? metadata.targetPlanId : null;
      const targetBillingCycle =
        typeof metadata.targetBillingCycle === "string"
          ? (metadata.targetBillingCycle as BillingCycle)
          : null;
      // Validate TRƯỚC khi ghi PAID: tránh hóa đơn PAID nhưng gói không được nâng cấp.
      if (!targetPlanId || !targetBillingCycle) {
        throw new BadRequestException({
          code: "INVALID_UPGRADE_INVOICE",
          message: "Hóa đơn nâng cấp thiếu thông tin gói",
        });
      }
      const sub = await this.prisma.system.subscription.findUnique({
        where: { tenantId: invoice.tenantId },
      });
      // Không có thuê bao (bất thường): vẫn ghi nhận đã thu, không có gì để nâng cấp.
      if (!sub) {
        return this.prisma.system.platformInvoice.update({
          where: { id: invoiceId },
          data: paidData,
        });
      }
      const now = new Date();
      const newEnd = new Date(now.getTime() + CYCLE_DAYS[targetBillingCycle] * 86_400_000);
      // Ghi PAID + đổi gói + log thay đổi trong CÙNG 1 transaction (nguyên tử).
      const [updatedInvoice] = await this.prisma.system.$transaction([
        this.prisma.system.platformInvoice.update({ where: { id: invoiceId }, data: paidData }),
        this.prisma.system.subscription.update({
          where: { tenantId: invoice.tenantId },
          data: {
            planId: targetPlanId,
            billingCycle: targetBillingCycle,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: newEnd,
            entitlementsCache: Prisma.DbNull,
            pastDueSince: null,
            suspendedAt: null,
          },
        }),
        this.prisma.system.subscriptionChange.create({
          data: {
            subscriptionId: sub.id,
            type: SubscriptionChangeType.UPGRADE,
            fromPlanId: sub.planId,
            toPlanId: targetPlanId,
            fromCycle: sub.billingCycle,
            toCycle: targetBillingCycle,
            effectiveAt: now,
            reason: "signup_upgrade_paid",
            metadata: { invoiceId },
          },
        }),
      ]);
      await this.lifecycle.syncTenantCache(invoice.tenantId);
      return updatedInvoice;
    }

    await this.prisma.system.platformInvoice.update({
      where: { id: invoiceId },
      data: paidData,
    });

    // Reactivate subscription + đẩy kỳ mới.
    const sub = await this.prisma.system.subscription.findUnique({
      where: { tenantId: invoice.tenantId },
    });
    if (sub) {
      const days = CYCLE_DAYS[sub.billingCycle];
      const newStart = sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
      const newEnd = new Date(newStart.getTime() + days * 86_400_000);
      await this.lifecycle.transition(invoice.tenantId, SubscriptionStatus.ACTIVE, {
        currentPeriodStart: newStart,
        currentPeriodEnd: newEnd,
        pastDueSince: null,
        suspendedAt: null,
      });
    }
    return this.prisma.system.platformInvoice.findUnique({ where: { id: invoiceId } });
  }

  /**
   * Số hóa đơn nền tảng: `{SLUG}-{MÃ_GÓI}-{YYYYMMDD}-{NN}` (vd HOASEN-PRO-20260625-01).
   * Gồm slug trường + mã gói + ngày lập → dễ đối soát chuyển khoản (addInfo VietQR = số HĐ).
   * Seq = số HĐ cùng prefix (trường+gói+ngày) + 1.
   */
  private async nextInvoiceNumber(slug: string, planCode: string, issuedAt: Date): Promise<string> {
    const y = issuedAt.getFullYear();
    const m = String(issuedAt.getMonth() + 1).padStart(2, "0");
    const d = String(issuedAt.getDate()).padStart(2, "0");
    const base = `${slug}-${planCode}-${y}${m}${d}`.toUpperCase();
    const count = await this.prisma.system.platformInvoice.count({
      where: { invoiceNumber: { startsWith: base } },
    });
    return `${base}-${String(count + 1).padStart(2, "0")}`;
  }
}
