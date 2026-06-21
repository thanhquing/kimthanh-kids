import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { TenantRole, UserType } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

export interface UpdateSettingsInput {
  displayName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  emailFromName?: string;
  supportEmail?: string;
  locale?: string;
  timezone?: string;
}
export interface CreateMemberInput {
  email?: string;
  phone?: string;
  fullName: string;
  role: TenantRole;
  schoolId?: string | null;
  password: string;
}

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  getSettings(tenantId: string) {
    return this.prisma.system.tenantSettings.findUnique({ where: { tenantId } });
  }

  updateSettings(tenantId: string, data: UpdateSettingsInput) {
    return this.prisma.system.tenantSettings.update({ where: { tenantId }, data });
  }

  /** Dùng prisma.db (auto-filter theo tenant) — minh hoạ cô lập dữ liệu. */
  listSchools() {
    return this.prisma.db.school.findMany({ orderBy: { createdAt: "asc" } });
  }

  createSchool(input: { name: string; code: string; address?: string; phone?: string }) {
    // tenantId tự được extension gán theo ngữ cảnh.
    return this.prisma.db.school.create({ data: input as never });
  }

  listMembers(tenantId: string) {
    return this.prisma.system.membership.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, fullName: true, isActive: true } },
        school: true,
      },
    });
  }

  /**
   * Tạo tài khoản thành viên (GV/PH/y tá/nhân viên...) trực tiếp — chủ trường (SCHOOL_ADMIN)
   * hoặc hiệu trưởng (PRINCIPAL) thực hiện. Định danh = email HOẶC số điện thoại (ít nhất 1).
   */
  async createMember(tenantId: string, input: CreateMemberInput) {
    const email = input.email?.trim() || null;
    const phone = input.phone?.trim() || null;
    if (!email && !phone)
      throw new BadRequestException({
        code: "NO_IDENTIFIER",
        message: "Cần email hoặc số điện thoại",
      });

    // Báo lỗi thân thiện khi trùng trong cùng trường (thay vì để P2002 thô).
    const dup = await this.prisma.system.user.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
      select: { id: true },
    });
    if (dup)
      throw new ConflictException({
        code: "MEMBER_EXISTS",
        message: "Email hoặc số điện thoại đã được dùng trong trường",
      });

    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.system.user.create({
      data: {
        type: UserType.TENANT,
        tenantId,
        email,
        phone,
        fullName: input.fullName,
        passwordHash,
        memberships: { create: { tenantId, role: input.role, schoolId: input.schoolId ?? null } },
      },
      select: { id: true, email: true, phone: true, fullName: true },
    });
  }

  listDomains(tenantId: string) {
    return this.prisma.system.tenantDomain.findMany({ where: { tenantId } });
  }

  async addCustomDomain(tenantId: string, host: string) {
    const normalized = host.toLowerCase().trim();
    const exists = await this.prisma.system.tenantDomain.findUnique({
      where: { host: normalized },
    });
    if (exists)
      throw new BadRequestException({ code: "DOMAIN_TAKEN", message: "Tên miền đã được dùng" });
    const verifyToken = `kimthanh-verify=${randomBytes(16).toString("hex")}`;
    return this.prisma.system.tenantDomain.create({
      data: { tenantId, host: normalized, type: "CUSTOM", status: "PENDING", verifyToken },
    });
  }

  /** Stub: thực tế kiểm tra TXT record. Phase 0 cho phép xác minh thủ công. */
  async verifyDomain(tenantId: string, domainId: string) {
    const domain = await this.prisma.system.tenantDomain.findFirst({
      where: { id: domainId, tenantId },
    });
    if (!domain)
      throw new BadRequestException({ code: "NO_DOMAIN", message: "Không tìm thấy tên miền" });
    return this.prisma.system.tenantDomain.update({
      where: { id: domainId },
      data: { status: "ACTIVE", verifiedAt: new Date() },
    });
  }
}
