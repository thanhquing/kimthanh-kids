import { Injectable } from "@nestjs/common";
import { SubscriptionStatus, TenantStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const STATUS_MAP: Record<SubscriptionStatus, TenantStatus> = {
  TRIALING: TenantStatus.TRIAL,
  ACTIVE: TenantStatus.ACTIVE,
  PAST_DUE: TenantStatus.PAST_DUE,
  SUSPENDED: TenantStatus.SUSPENDED,
  CANCELED: TenantStatus.CANCELLED,
  EXPIRED: TenantStatus.CANCELLED,
};

/** Đồng bộ trạng thái subscription (nguồn chân lý) → Tenant.status (cache cho guard). */
@Injectable()
export class LifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async syncTenantCache(tenantId: string): Promise<void> {
    const sub = await this.prisma.system.subscription.findUnique({ where: { tenantId } });
    if (!sub) return;
    await this.prisma.system.tenant.update({
      where: { id: tenantId },
      data: {
        status: STATUS_MAP[sub.status],
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
        planTier: (await this.prisma.system.plan.findUnique({ where: { id: sub.planId } }))?.tier,
      },
    });
  }

  async transition(
    tenantId: string,
    status: SubscriptionStatus,
    patch: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.system.subscription.update({
      where: { tenantId },
      data: { status, ...patch },
    });
    await this.syncTenantCache(tenantId);
  }
}
