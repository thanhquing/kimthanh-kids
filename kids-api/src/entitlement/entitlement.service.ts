import { ForbiddenException, Injectable } from "@nestjs/common";
import { LimitEnforcement, LimitMetric } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ResolvedLimit {
  limitValue: number | null; // null = unlimited
  enforcement: LimitEnforcement;
}
export interface Entitlements {
  features: Record<string, boolean>;
  limits: Partial<Record<LimitMetric, ResolvedLimit>>;
}

/**
 * Tính entitlements (feature flags + quota) của 1 tenant từ Plan + override TenantEntitlement.
 * Enforce quota qua UsageCounter (counter cache). Dùng prisma.system (xuyên tenant).
 */
@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(tenantId: string): Promise<Entitlements> {
    const sub = await this.prisma.system.subscription.findUnique({
      where: { tenantId },
      include: { plan: { include: { features: true, limits: true } }, overrides: true },
    });
    if (!sub) return { features: {}, limits: {} };

    const features: Record<string, boolean> = {};
    for (const f of sub.plan.features) features[f.featureKey] = f.enabled;

    const limits: Partial<Record<LimitMetric, ResolvedLimit>> = {};
    for (const l of sub.plan.limits) {
      limits[l.metric] = { limitValue: l.limitValue, enforcement: l.enforcement };
    }

    const now = new Date();
    for (const o of sub.overrides) {
      if (o.expiresAt && o.expiresAt < now) continue;
      if (o.featureKey && o.enabled !== null) features[o.featureKey] = o.enabled;
      if (o.metric)
        limits[o.metric] = {
          limitValue: o.limitValue ?? null,
          enforcement: limits[o.metric]?.enforcement ?? LimitEnforcement.HARD,
        };
    }

    return { features, limits };
  }

  async hasFeature(tenantId: string, featureKey: string): Promise<boolean> {
    const { features } = await this.resolve(tenantId);
    return features[featureKey] === true;
  }

  /** Kiểm tra + tăng quota nguyên tử. HARD vượt → 403. Gọi trong transaction tạo thực thể (Phase 1). */
  async consumeQuota(tenantId: string, metric: LimitMetric, delta = 1): Promise<void> {
    const { limits } = await this.resolve(tenantId);
    const limit = limits[metric];
    if (!limit || limit.limitValue === null) {
      await this.bumpCounter(tenantId, metric, delta);
      return;
    }
    if (limit.enforcement === LimitEnforcement.HARD) {
      // Tăng nguyên tử có điều kiện: chỉ tăng nếu sau khi tăng vẫn <= limit.
      const res = await this.prisma.system.usageCounter.updateMany({
        where: { tenantId, metric, value: { lte: limit.limitValue - delta } },
        data: { value: { increment: delta } },
      });
      if (res.count === 0) {
        // Chưa có counter → khởi tạo nếu delta nằm trong hạn mức; ngược lại đã vượt.
        const created = await this.ensureCounterWithinLimit(
          tenantId,
          metric,
          delta,
          limit.limitValue,
        );
        if (!created)
          throw new ForbiddenException({
            code: "QUOTA_EXCEEDED",
            message: `Đã đạt giới hạn ${metric} của gói (${limit.limitValue})`,
          });
      }
    } else {
      await this.bumpCounter(tenantId, metric, delta); // SOFT: cho vượt
    }
  }

  async releaseQuota(tenantId: string, metric: LimitMetric, delta = 1): Promise<void> {
    await this.bumpCounter(tenantId, metric, -delta);
  }

  async getUsage(tenantId: string): Promise<Partial<Record<LimitMetric, number>>> {
    const rows = await this.prisma.system.usageCounter.findMany({ where: { tenantId } });
    const out: Partial<Record<LimitMetric, number>> = {};
    for (const r of rows) out[r.metric] = r.value;
    return out;
  }

  private async bumpCounter(tenantId: string, metric: LimitMetric, delta: number): Promise<void> {
    await this.prisma.system.usageCounter.upsert({
      where: { tenantId_metric: { tenantId, metric } },
      create: { tenantId, metric, value: Math.max(0, delta) },
      update: { value: { increment: delta } },
    });
  }

  private async ensureCounterWithinLimit(
    tenantId: string,
    metric: LimitMetric,
    delta: number,
    limitValue: number,
  ): Promise<boolean> {
    const existing = await this.prisma.system.usageCounter.findUnique({
      where: { tenantId_metric: { tenantId, metric } },
    });
    if (existing) return false; // đã có → UPDATE ở trên đã quyết định
    if (delta > limitValue) return false;
    await this.prisma.system.usageCounter.create({ data: { tenantId, metric, value: delta } });
    return true;
  }
}
