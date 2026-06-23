import { Injectable } from "@nestjs/common";
import { Prisma, TenantStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface TrackOptions {
  tenantId?: string | null;
  userId?: string | null;
  meta?: Prisma.InputJsonValue;
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ghi 1 event vận hành (login, signup, feature-hit...). Dùng prisma.system để KHÔNG phụ thuộc
   * tenant-context (login chạy trước khi có JWT) — set tenantId tường minh.
   */
  async track(type: string, opts: TrackOptions = {}): Promise<void> {
    await this.prisma.system.usageEvent.create({
      data: {
        type,
        tenantId: opts.tenantId ?? null,
        userId: opts.userId ?? null,
        meta: opts.meta,
      },
    });
  }

  /** Tổng quan vận hành cho operator (xuyên tenant) — DAU/WAU/MAU + top event. */
  async overview() {
    const now = new Date();
    const day = 24 * 3600 * 1000;
    const dayAgo = new Date(now.getTime() - day);
    const weekAgo = new Date(now.getTime() - 7 * day);
    const monthAgo = new Date(now.getTime() - 30 * day);

    const [tenants, activeTenants, users, dau, wau, mau, byType] = await Promise.all([
      this.prisma.system.tenant.count(),
      this.prisma.system.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
      this.prisma.system.user.count({ where: { deletedAt: null } }),
      this.activeUsersSince(dayAgo),
      this.activeUsersSince(weekAgo),
      this.activeUsersSince(monthAgo),
      this.prisma.system.usageEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: monthAgo } },
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
        take: 10,
      }),
    ]);

    return {
      tenants,
      activeTenants,
      users,
      dau,
      wau,
      mau,
      topEvents: byType.map((t) => ({ type: t.type, count: t._count._all })),
    };
  }

  /** Số người dùng riêng biệt có đăng nhập kể từ mốc thời gian (định nghĩa "active"). */
  private async activeUsersSince(since: Date): Promise<number> {
    const rows = await this.prisma.system.usageEvent.findMany({
      where: { type: "login", createdAt: { gte: since }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    });
    return rows.length;
  }
}
