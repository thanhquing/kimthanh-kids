import { Injectable, Logger } from "@nestjs/common";
import { Prisma, UserType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { page, PaginationQuery } from "../common/http/pagination";
import { paginated } from "../common/http/api-response";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditInput {
  tenantId: string | null;
  actorId?: string | null;
  actorType?: UserType; // mặc định suy từ tenantId; set khi platform thao tác xuyên tenant
  action: string; // "invoice.cancel" | "student.delete" | "member.create"...
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ghi nhật ký 1 hành động nhạy cảm. AuditLog là model GLOBAL (không nằm trong TENANT_KEY)
   * → ghi qua prisma.system + set tenantId tường minh.
   *
   * BEST-EFFORT: nuốt lỗi (chỉ log) — ghi audit KHÔNG được làm hỏng hành động chính.
   * actorType suy ra từ tenantId (mọi actor hiện tại là user tenant); truyền actorType
   * tường minh khi platform thao tác xuyên tenant về sau.
   */
  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.system.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId ?? null,
          actorType: input.actorType ?? (input.tenantId ? UserType.TENANT : UserType.PLATFORM),
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          metadata: input.metadata,
        },
      });
    } catch (e) {
      this.logger.error(`audit log thất bại (action=${input.action})`, e as Error);
    }
  }

  /** Tiện ích ghi log từ AuthUser (actor = người đang đăng nhập). */
  logAs(
    user: AuthUser,
    action: string,
    target?: { type?: string; id?: string },
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    return this.log({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      targetType: target?.type,
      targetId: target?.id,
      metadata,
    });
  }

  /** Nhật ký của tenant hiện tại (admin/HT xem). */
  async list(user: AuthUser, opts: { action?: string } & PaginationQuery = {}) {
    const pg = page(opts);
    const where = { tenantId: user.tenantId, ...(opts.action ? { action: opts.action } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.system.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
        // Không passthrough metadata thô (có thể chứa dữ liệu nhạy cảm do writer thêm sau này).
        // Prisma 5.22 chưa bật omit → select tường minh field an toàn (loại metadata).
        select: {
          id: true,
          tenantId: true,
          actorId: true,
          actorType: true,
          action: true,
          targetType: true,
          targetId: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      this.prisma.system.auditLog.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }
}
