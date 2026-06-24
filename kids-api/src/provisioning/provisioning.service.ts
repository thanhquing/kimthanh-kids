import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  BillingCycle,
  SubscriptionStatus,
  TenantRole,
  TenantStatus,
  UserType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { isValidTaxCode, normalizeTaxCode } from "../common/validation/tax-code";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "static",
  "cdn",
  "assets",
  "dashboard",
  "billing",
  "support",
  "help",
]);
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;

export interface SignupInput {
  schoolName: string;
  slug: string;
  taxCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
}

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  private hostFor(slug: string): string {
    return `${slug}.${this.env.get("ROOT_DOMAIN")}`;
  }

  async checkSlugAvailable(slug: string): Promise<{ available: boolean; reason?: string }> {
    if (!SLUG_RE.test(slug))
      return { available: false, reason: "Slug không hợp lệ (a-z, 0-9, dấu gạch)" };
    if (RESERVED_SLUGS.has(slug)) return { available: false, reason: "Slug đã được dành riêng" };
    const exists = await this.prisma.system.tenantDomain.findUnique({
      where: { host: this.hostFor(slug) },
    });
    return exists ? { available: false, reason: "Slug đã được sử dụng" } : { available: true };
  }

  /** Onboard trường mới: Tenant + Settings + Subdomain + School + Admin + Trial subscription (1 TX). */
  async signup(input: SignupInput) {
    const check = await this.checkSlugAvailable(input.slug);
    if (!check.available)
      throw new BadRequestException({ code: "SLUG_UNAVAILABLE", message: check.reason });

    // MST: bắt buộc, đúng format/checksum, và mỗi MST chỉ mở 1 trường (chống tạo trial ảo hàng loạt).
    const taxCode = normalizeTaxCode(input.taxCode);
    if (!isValidTaxCode(taxCode))
      throw new BadRequestException({
        code: "INVALID_TAX_CODE",
        message: "Mã số thuế không hợp lệ (10 hoặc 13 chữ số)",
      });
    const taxTaken = await this.prisma.system.tenant.findFirst({
      where: { taxCode, deletedAt: null },
      select: { id: true },
    });
    if (taxTaken)
      throw new ConflictException({
        code: "TAX_CODE_TAKEN",
        message: "Mã số thuế này đã được dùng để đăng ký một trường khác",
      });

    const freePlan = await this.prisma.system.plan.findUnique({ where: { code: "free" } });
    if (!freePlan)
      throw new BadRequestException({
        code: "NO_FREE_PLAN",
        message: "Chưa cấu hình gói Miễn phí",
      });

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);
    const now = new Date();
    // Freemium: gói Miễn phí dùng vĩnh viễn (ACTIVE), không có hạn dùng thử.
    const periodEnd = new Date(now.getTime() + 100 * 365 * 86_400_000);
    const host = this.hostFor(input.slug);

    try {
      return await this.prisma.system.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug: input.slug,
            legalName: input.schoolName,
            taxCode,
            status: TenantStatus.ACTIVE,
            planTier: freePlan.tier,
            trialEndsAt: null,
            currentPeriodEnd: periodEnd,
            settings: { create: { displayName: input.schoolName, taxCode } },
            domains: {
              create: {
                host,
                type: "SUBDOMAIN",
                status: "ACTIVE",
                isPrimary: true,
                verifiedAt: now,
              },
            },
          },
        });

        const school = await tx.school.create({
          data: { tenantId: tenant.id, name: input.schoolName, code: "MAIN", phone: input.phone },
        });

        const admin = await tx.user.create({
          data: {
            type: UserType.TENANT,
            email: input.adminEmail,
            passwordHash,
            fullName: input.adminFullName,
            phone: input.phone,
            tenantId: tenant.id,
            memberships: {
              create: { tenantId: tenant.id, role: TenantRole.SCHOOL_ADMIN, schoolId: null },
            },
          },
        });

        const subscription = await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: freePlan.id,
            billingCycle: BillingCycle.MONTHLY,
            billingMode: "GATEWAY",
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: null,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorId: admin.id,
            actorType: UserType.TENANT,
            action: "tenant.signup",
            targetType: "Tenant",
            targetId: tenant.id,
          },
        });

        return {
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            host,
            status: tenant.status,
            trialEndsAt: null,
          },
          school: { id: school.id },
          admin: { id: admin.id, email: admin.email },
          subscription: { id: subscription.id, status: subscription.status },
        };
      });
    } catch (e) {
      if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
        throw new ConflictException({
          code: "ALREADY_EXISTS",
          message: "Slug hoặc email đã tồn tại",
        });
      }
      throw e;
    }
  }

  async brandingByHost(host: string) {
    const normalized = host.split(":")[0].toLowerCase();
    const domain = await this.prisma.system.tenantDomain.findFirst({
      where: { host: normalized, status: "ACTIVE" },
      select: { tenant: { select: { id: true, slug: true, settings: true } } },
    });
    if (!domain?.tenant) return null;
    const s = domain.tenant.settings;
    return {
      tenantId: domain.tenant.id,
      slug: domain.tenant.slug,
      displayName: s?.displayName ?? "KimThanh Kids",
      logoUrl: s?.logoUrl ?? null,
      faviconUrl: s?.faviconUrl ?? null,
      primaryColor: s?.primaryColor ?? null,
      secondaryColor: s?.secondaryColor ?? null,
      locale: s?.locale ?? "vi-VN",
    };
  }
}
