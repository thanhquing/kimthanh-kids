import { Injectable, Logger } from "@nestjs/common";
import {
  BillingCurrency,
  BillingCycle,
  MrrSnapshotSource,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type SubWithPlan = Prisma.SubscriptionGetPayload<{
  include: { plan: { include: { prices: true } } };
}>;

export interface MonthlyRevenuePoint {
  period: string; // "YYYY-MM"
  month: string; // "T6"
  value: number; // MRR (VND/tháng)
  source: "CRON" | "BACKFILL" | "DERIVED";
}

/**
 * Quản lý MRR theo tháng: tính MRR hiện tại, chốt snapshot (cron/backfill) và dựng chuỗi nhiều tháng.
 * Snapshot là số THỰC bất biến (không bị mù churn như suy ngược); DERIVED chỉ là fallback khi 1 tháng
 * chưa có snapshot. Platform-global → dùng prisma.system.
 */
@Injectable()
export class MrrSnapshotService {
  private readonly logger = new Logger(MrrSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** MRR (VND/tháng) của 1 thuê bao, quy giá gói VND về tháng theo chu kỳ. */
  subMrr(sub: SubWithPlan): number {
    const price = sub.plan?.prices.find(
      (p) => p.billingCycle === sub.billingCycle && p.currency === BillingCurrency.VND,
    );
    if (!price) return 0;
    const amount = Number(price.amount);
    switch (sub.billingCycle) {
      case BillingCycle.QUARTERLY:
        return amount / 3;
      case BillingCycle.ANNUAL:
        return amount / 12;
      default:
        return amount; // MONTHLY
    }
  }

  private activeSubs(): Promise<SubWithPlan[]> {
    return this.prisma.system.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: { include: { prices: true } } },
    });
  }

  /** 00:00 ngày 1 của tháng chứa `d` (UTC) — mốc đại diện cho snapshot. */
  private monthStart(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  /** Tổng MRR + số thuê bao + phân rã theo tier, tại thời điểm hiện tại. */
  async computeCurrentMrr(): Promise<{
    mrr: number;
    activeSubs: number;
    byTier: Record<string, number>;
  }> {
    const subs = await this.activeSubs();
    let mrr = 0;
    const byTier: Record<string, number> = {};
    for (const s of subs) {
      const v = this.subMrr(s);
      mrr += v;
      if (s.plan) byTier[s.plan.tier] = (byTier[s.plan.tier] ?? 0) + v;
    }
    for (const k of Object.keys(byTier)) byTier[k] = Math.round(byTier[k]);
    return { mrr: Math.round(mrr), activeSubs: subs.length, byTier };
  }

  /** Chốt snapshot CRON cho tháng chứa `at` = MRR hiện tại (upsert idempotent). */
  async snapshot(at: Date, source: MrrSnapshotSource = MrrSnapshotSource.CRON) {
    const periodMonth = this.monthStart(at);
    const { mrr, activeSubs, byTier } = await this.computeCurrentMrr();
    return this.prisma.system.mrrSnapshot.upsert({
      where: { periodMonth },
      create: { periodMonth, mrr, activeSubs, byTier, source },
      update: { mrr, activeSubs, byTier, source },
    });
  }

  /** Cron đầu tháng: chốt số THỰC cho tháng vừa kết thúc. */
  async snapshotPreviousMonth() {
    const now = new Date();
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const snap = await this.snapshot(prev, MrrSnapshotSource.CRON);
    this.logger.log(`MRR snapshot ${prev.toISOString().slice(0, 7)} = ${snap.mrr}`);
    return snap;
  }

  /**
   * Backfill `months` tháng gần nhất từ trạng thái hiện tại (suy ngược theo ngày tạo thuê bao —
   * GẦN ĐÚNG, mù churn). CHỈ ghi tháng nào CHƯA có snapshot → không đè số thực CRON.
   */
  async backfill(months = 24): Promise<number> {
    const subs = await this.activeSubs();
    const now = new Date();
    let written = 0;
    for (let i = 0; i < months; i++) {
      const periodMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const monthEnd = new Date(
        Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth() + 1, 0, 23, 59, 59, 999),
      );
      const existing = await this.prisma.system.mrrSnapshot.findUnique({ where: { periodMonth } });
      if (existing) continue; // giữ nguyên số thực đã có
      const inMonth = subs.filter((s) => s.createdAt <= monthEnd);
      let mrr = 0;
      const byTier: Record<string, number> = {};
      for (const s of inMonth) {
        const v = this.subMrr(s);
        mrr += v;
        if (s.plan) byTier[s.plan.tier] = (byTier[s.plan.tier] ?? 0) + v;
      }
      for (const k of Object.keys(byTier)) byTier[k] = Math.round(byTier[k]);
      await this.prisma.system.mrrSnapshot.create({
        data: {
          periodMonth,
          mrr: Math.round(mrr),
          activeSubs: inMonth.length,
          byTier,
          source: MrrSnapshotSource.BACKFILL,
        },
      });
      written++;
    }
    return written;
  }

  /**
   * Chuỗi MRR `months` tháng gần nhất (cũ→mới), không gãy: ưu tiên snapshot; tháng nào thiếu thì
   * suy ngược (DERIVED) từ thuê bao hiện tại để biểu đồ không bị lỗ hổng.
   */
  async monthlySeries(months: number): Promise<MonthlyRevenuePoint[]> {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

    const snaps = await this.prisma.system.mrrSnapshot.findMany({
      where: { periodMonth: { gte: from } },
      orderBy: { periodMonth: "asc" },
    });
    const byPeriod = new Map(snaps.map((s) => [s.periodMonth.toISOString().slice(0, 7), s]));

    // Cần thuê bao hiện tại để fill DERIVED các tháng thiếu snapshot.
    const needsDerive = byPeriod.size < months;
    const subs = needsDerive ? await this.activeSubs() : [];

    const out: MonthlyRevenuePoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const period = m.toISOString().slice(0, 7);
      const month = `T${m.getUTCMonth() + 1}`;
      const snap = byPeriod.get(period);
      if (snap) {
        out.push({ period, month, value: Number(snap.mrr), source: snap.source });
      } else {
        const monthEnd = new Date(
          Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0, 23, 59, 59, 999),
        );
        const value = subs
          .filter((s) => s.createdAt <= monthEnd)
          .reduce((sum, s) => sum + this.subMrr(s), 0);
        out.push({ period, month, value: Math.round(value), source: "DERIVED" });
      }
    }
    return out;
  }

  /** % tăng trưởng tháng cuối so mốc: tháng liền trước nếu >0, nếu không thì tháng đầu có MRR. */
  growthPct(values: number[]): number {
    const last = values[values.length - 1] ?? 0;
    const prev = values[values.length - 2] ?? 0;
    const base = prev > 0 ? prev : (values.find((v) => v > 0) ?? 0);
    return base > 0 ? Math.round(((last - base) / base) * 1000) / 10 : 0;
  }
}
