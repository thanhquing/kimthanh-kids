import { BadRequestException, Injectable } from "@nestjs/common";
import { ConsentDocType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AcceptMeta {
  userId?: string | null;
  tenantId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Consent pháp lý (BL-046): văn bản có phiên bản + log chấp thuận bất biến.
 * Dùng prisma.system (bảng consent là system, xuyên tenant).
 */
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Các văn bản đang hiệu lực (đầy đủ nội dung) cho locale — cho landing + trang đọc. */
  activeDocuments(locale = "vi") {
    return this.prisma.system.consentDocument.findMany({
      where: { isActive: true, locale },
      orderBy: { type: "asc" },
      select: {
        id: true,
        type: true,
        version: true,
        locale: true,
        title: true,
        summary: true,
        body: true,
        effectiveFrom: true,
      },
    });
  }

  /** Văn bản hiệu lực mà user CHƯA chấp thuận (đúng version) — dùng để gate đăng nhập. */
  async pendingForUser(userId: string, locale = "vi") {
    const active = await this.prisma.system.consentDocument.findMany({
      where: { isActive: true, locale },
      orderBy: { type: "asc" },
      select: { id: true, type: true, version: true, title: true, summary: true },
    });
    if (!active.length) return [];
    const accepted = await this.prisma.system.consentAcceptance.findMany({
      where: {
        userId,
        OR: active.map((d) => ({ docType: d.type, version: d.version })),
      },
      select: { docType: true, version: true },
    });
    const acceptedKey = new Set(accepted.map((a) => `${a.docType}:${a.version}`));
    return active.filter((d) => !acceptedKey.has(`${d.type}:${d.version}`));
  }

  /** Ghi nhận user chấp thuận danh sách documentId (phải là bản đang hiệu lực). */
  async accept(documentIds: string[], meta: AcceptMeta) {
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new BadRequestException({
        code: "CONSENT_REQUIRED",
        message: "Cần chấp thuận văn bản pháp lý",
      });
    }
    const docs = await this.prisma.system.consentDocument.findMany({
      where: { id: { in: documentIds }, isActive: true },
      select: { id: true, type: true, version: true },
    });
    if (docs.length === 0) {
      throw new BadRequestException({
        code: "CONSENT_DOC_INVALID",
        message: "Văn bản không hợp lệ hoặc đã hết hiệu lực",
      });
    }
    await this.prisma.system.consentAcceptance.createMany({
      data: docs.map((d) => ({
        documentId: d.id,
        docType: d.type,
        version: d.version,
        userId: meta.userId ?? null,
        tenantId: meta.tenantId ?? null,
        email: meta.email ?? null,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      })),
    });
    return { accepted: docs.map((d) => ({ type: d.type, version: d.version })) };
  }

  /** Khóa các văn bản hiệu lực (id/type/version) — dùng dựng bản ghi acceptance lúc signup. */
  activeDocKeys(locale = "vi"): Promise<{ id: string; type: ConsentDocType; version: string }[]> {
    return this.prisma.system.consentDocument.findMany({
      where: { isActive: true, locale },
      select: { id: true, type: true, version: true },
    });
  }
}
