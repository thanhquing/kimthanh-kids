import { Injectable } from "@nestjs/common";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

/** Nạp AuthUser (kèm role + school scope) từ DB. Dùng prisma.system (xuyên tenant) vì auth. */
@Injectable()
export class UserContextService {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.system.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      include: {
        memberships: { where: { isActive: true, deletedAt: null } },
      },
    });
    if (!user) return null;

    const roles = user.memberships.map((m) => m.role);
    // null = role toàn tenant (có membership schoolId null) → thấy mọi school
    const hasTenantWide = user.memberships.some((m) => m.schoolId === null);
    const allowedSchoolIds = hasTenantWide
      ? null
      : [...new Set(user.memberships.map((m) => m.schoolId).filter((s): s is string => !!s))];

    return {
      id: user.id,
      type: user.type,
      tenantId: user.tenantId,
      platformRole: user.platformRole,
      fullName: user.fullName ?? null,
      phone: user.phone ?? null,
      roles,
      allowedSchoolIds,
      tokenVersion: user.tokenVersion,
    };
  }
}
