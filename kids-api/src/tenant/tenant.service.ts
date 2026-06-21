import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { LimitMetric, TenantRole, UserType } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Vai trò → quota tính phí khi tạo tài khoản:
 * - TEACHER → TEACHERS (giới hạn "số giáo viên" của gói).
 * - SCHOOL_ADMIN/PRINCIPAL/NURSE/FINANCE → ADMIN_USERS (tài khoản quản lý/nghiệp vụ).
 * - PARENT → null ở counter; thay vào đó bị chặn theo giới hạn STUDENTS
 *   (1 học sinh ~ 1 phụ huynh đại diện) — xem assertParentWithinStudentLimit.
 */
function quotaMetricForRole(role: TenantRole): LimitMetric | null {
  if (role === TenantRole.TEACHER) return LimitMetric.TEACHERS;
  if (role === TenantRole.PARENT) return null;
  return LimitMetric.ADMIN_USERS;
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

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

    // Phụ huynh bị giới hạn theo số học sinh của gói (1 HS ~ 1 PH đại diện).
    if (input.role === TenantRole.PARENT) await this.assertParentWithinStudentLimit(tenantId);

    // Tiêu quota theo vai trò (PARENT không tính counter). HARD vượt hạn → 403 QUOTA_EXCEEDED.
    const metric = quotaMetricForRole(input.role);
    if (metric) await this.entitlements.consumeQuota(tenantId, metric);

    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      return await this.prisma.system.user.create({
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
    } catch (e) {
      if (metric) await this.entitlements.releaseQuota(tenantId, metric);
      throw e;
    }
  }

  /**
   * Số tài khoản phụ huynh ≤ giới hạn học sinh của gói (theo dõi trực tiếp số membership PARENT,
   * nên tự bám theo STUDENTS kể cả khi platform override). STUDENTS null = không giới hạn.
   */
  private async assertParentWithinStudentLimit(tenantId: string) {
    const { limits } = await this.entitlements.resolve(tenantId);
    const cap = limits.STUDENTS?.limitValue ?? null;
    if (cap === null) return;
    const count = await this.prisma.system.membership.count({
      where: { tenantId, role: TenantRole.PARENT, deletedAt: null },
    });
    if (count >= cap)
      throw new ForbiddenException({
        code: "QUOTA_EXCEEDED",
        message: `Đã đạt giới hạn số phụ huynh (theo số học sinh của gói: ${cap})`,
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
