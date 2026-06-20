import { Injectable, Logger } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";
import { LifecycleService } from "./lifecycle.service";

/**
 * Logic các job billing — tách khỏi lịch chạy để test gọi trực tiếp (deterministic).
 * Mọi job idempotent + chạy xuyên tenant (prisma.system).
 */
@Injectable()
export class BillingJobsService {
  private readonly logger = new Logger(BillingJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly env: EnvService,
  ) {}

  /** Trial hết hạn & chưa thanh toán → EXPIRED. */
  async expireTrials(now = new Date()): Promise<number> {
    const subs = await this.prisma.system.subscription.findMany({
      where: { status: SubscriptionStatus.TRIALING, trialEndsAt: { lte: now } },
      select: { tenantId: true },
    });
    for (const s of subs) {
      await this.lifecycle.transition(s.tenantId, SubscriptionStatus.EXPIRED, { endedAt: now });
    }
    if (subs.length) this.logger.log(`expireTrials: ${subs.length} subscription EXPIRED`);
    return subs.length;
  }

  /** Hóa đơn OPEN quá hạn → OVERDUE + subscription PAST_DUE. */
  async markOverdueInvoices(now = new Date()): Promise<number> {
    const invoices = await this.prisma.system.platformInvoice.findMany({
      where: { status: "OPEN", dueAt: { lt: now } },
      select: { id: true, tenantId: true },
    });
    for (const inv of invoices) {
      await this.prisma.system.platformInvoice.update({
        where: { id: inv.id },
        data: { status: "OVERDUE" },
      });
      const sub = await this.prisma.system.subscription.findUnique({
        where: { tenantId: inv.tenantId },
      });
      if (sub && (sub.status === "ACTIVE" || sub.status === "TRIALING")) {
        await this.lifecycle.transition(inv.tenantId, SubscriptionStatus.PAST_DUE, {
          pastDueSince: now,
        });
      }
    }
    if (invoices.length) this.logger.log(`markOverdueInvoices: ${invoices.length} OVERDUE`);
    return invoices.length;
  }

  /** PAST_DUE quá grace → SUSPENDED. */
  async dunningSuspend(now = new Date()): Promise<number> {
    const graceMs = this.env.get("PAST_DUE_GRACE_DAYS") * 86_400_000;
    const subs = await this.prisma.system.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        pastDueSince: { lte: new Date(now.getTime() - graceMs) },
      },
      select: { tenantId: true },
    });
    for (const s of subs) {
      await this.lifecycle.transition(s.tenantId, SubscriptionStatus.SUSPENDED, {
        suspendedAt: now,
      });
    }
    if (subs.length) this.logger.log(`dunningSuspend: ${subs.length} SUSPENDED`);
    return subs.length;
  }

  /** SUSPENDED quá grace cuối → CANCELED. */
  async dunningCancel(now = new Date()): Promise<number> {
    const graceMs = this.env.get("SUSPENDED_GRACE_DAYS") * 86_400_000;
    const subs = await this.prisma.system.subscription.findMany({
      where: {
        status: SubscriptionStatus.SUSPENDED,
        suspendedAt: { lte: new Date(now.getTime() - graceMs) },
      },
      select: { tenantId: true },
    });
    for (const s of subs) {
      await this.lifecycle.transition(s.tenantId, SubscriptionStatus.CANCELED, {
        canceledAt: now,
        endedAt: now,
      });
    }
    if (subs.length) this.logger.log(`dunningCancel: ${subs.length} CANCELED`);
    return subs.length;
  }
}
