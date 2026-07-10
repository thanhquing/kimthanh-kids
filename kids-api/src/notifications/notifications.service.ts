import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { page, PaginationQuery } from "../common/http/pagination";
import { paginated } from "../common/http/api-response";
import { PrismaService } from "../prisma/prisma.service";

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body?: string;
  linkType?: string;
  linkId?: string;
}

const SAFE_COPY_BY_TYPE: Partial<Record<NotificationType, Pick<NotifyPayload, "title" | "body">>> =
  {
    [NotificationType.DAILY_REPORT]: { title: "Có báo cáo ngày mới" },
    [NotificationType.INCIDENT]: { title: "Có cập nhật sự cố" },
    [NotificationType.MEDICINE]: { title: "Có cập nhật yêu cầu thuốc" },
    [NotificationType.LEAVE]: { title: "Có cập nhật đơn xin nghỉ" },
  };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gửi tới danh sách user (bỏ trùng + rỗng), loại bỏ ai đã TẮT loại này.
   * Mặc định = bật (chỉ lưu preference khi user ghi đè). Là chốt chặn duy nhất để
   * sau này gắn thêm push FCM.
   *
   * BEST-EFFORT: nuốt lỗi (chỉ log) — thông báo là side-effect phụ, KHÔNG được làm
   * hỏng hành động nghiệp vụ chính đã ghi thành công trước đó.
   */
  async notify(tenantId: string, userIds: string[], p: NotifyPayload): Promise<void> {
    try {
      const payload = this.safePayload(p);
      const ids = [...new Set(userIds)].filter(Boolean);
      if (!ids.length) return;
      const disabled = await this.prisma.db.notificationPreference.findMany({
        where: { userId: { in: ids }, type: payload.type, enabled: false },
        select: { userId: true },
      });
      const off = new Set(disabled.map((d) => d.userId));
      const recipients = ids.filter((id) => !off.has(id));
      if (!recipients.length) return;
      await this.prisma.db.notification.createMany({
        data: recipients.map((userId) => ({
          tenantId,
          userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          linkType: payload.linkType,
          linkId: payload.linkId,
        })),
      });
    } catch (e) {
      this.logger.error(`notify thất bại (type=${p.type}, tenant=${tenantId})`, e as Error);
    }
  }

  private safePayload(p: NotifyPayload): NotifyPayload {
    const safe = SAFE_COPY_BY_TYPE[p.type];
    if (!safe) return p;
    return {
      ...p,
      title: safe.title,
      body: safe.body,
    };
  }

  /** Tiện ích: gửi tới mọi phụ huynh của 1 học sinh. Best-effort như notify(). */
  async notifyStudentParents(tenantId: string, studentId: string, p: NotifyPayload): Promise<void> {
    try {
      const links = await this.prisma.db.studentParent.findMany({
        where: { studentId },
        select: { parentId: true },
      });
      await this.notify(
        tenantId,
        links.map((l) => l.parentId),
        p,
      );
    } catch (e) {
      this.logger.error(`notifyStudentParents thất bại (student=${studentId})`, e as Error);
    }
  }

  async feed(user: AuthUser, opts: { unreadOnly?: boolean } & PaginationQuery = {}) {
    const pg = page(opts);
    const where = { userId: user.id, ...(opts.unreadOnly ? { readAt: null } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.notification.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.db.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return { count };
  }

  async markRead(user: AuthUser, id: string) {
    const n = await this.prisma.db.notification.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!n)
      throw new NotFoundException({ code: "NO_NOTIFICATION", message: "Không tìm thấy thông báo" });
    return this.prisma.db.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(user: AuthUser) {
    const r = await this.prisma.db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: r.count };
  }

  /** Trả về toàn bộ loại kèm trạng thái bật/tắt (mặc định bật nếu chưa ghi đè). */
  async getPreferences(user: AuthUser) {
    const rows = await this.prisma.db.notificationPreference.findMany({
      where: { userId: user.id },
    });
    const overrides = new Map(rows.map((r) => [r.type, r.enabled]));
    return Object.values(NotificationType).map((type) => ({
      type,
      enabled: overrides.get(type) ?? true,
    }));
  }

  setPreference(user: AuthUser, type: NotificationType, enabled: boolean) {
    // upsert KHÔNG được extension auto-gán tenantId → set tường minh ở create.
    return this.prisma.db.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: { tenantId: user.tenantId!, userId: user.id, type, enabled },
      update: { enabled },
    });
  }
}
