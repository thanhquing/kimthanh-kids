import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
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
    return this.prisma.system.plan.findMany({
      where: { isPublic: true, isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { prices: { where: { isActive: true } }, features: true, limits: true },
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
    const plan = await this.prisma.system.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new BadRequestException({ code: "INVALID_PLAN", message: "Gói không hợp lệ" });
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
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException({ code: "NO_SUBSCRIPTION", message: "Chưa có thuê bao" });

    const price = await this.prisma.system.planPrice.findUnique({
      where: {
        planId_billingCycle_currency: {
          planId: sub.planId,
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
    const invoiceNumber = await this.nextInvoiceNumber();
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
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 7 * 86_400_000),
        lines: {
          create: {
            kind: "SUBSCRIPTION",
            label: `${sub.plan.name} — ${sub.billingCycle}`,
            quantity: 1,
            unitPrice: amount,
            amount,
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

    await this.prisma.system.platformInvoice.update({
      where: { id: invoiceId },
      data: { status: PlatformInvoiceStatus.PAID, amountPaid: paidAmount, paidAt: new Date() },
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

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.system.platformInvoice.count({
      where: { invoiceNumber: { startsWith: `PINV-${year}-` } },
    });
    return `PINV-${year}-${String(count + 1).padStart(6, "0")}`;
  }
}
