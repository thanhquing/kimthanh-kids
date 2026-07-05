import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  BillingCycle,
  BillingCurrency,
  SubscriptionStatus,
  TenantRole,
  TenantStatus,
  UserType,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../common/crypto/password";
import { BillingService } from "../billing/billing.service";
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
  /** Mã trường human-friendly để search/chọn ở login. Bỏ trống → tự sinh từ slug. */
  code?: string;
  taxCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
  planCode?: string;
  billingCycle?: BillingCycle;
}

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly billing: BillingService,
  ) {}

  private hostFor(slug: string): string {
    return `${slug}.${this.env.get("ROOT_DOMAIN")}`;
  }

  /**
   * Chuẩn hóa + đảm bảo duy nhất "mã trường". Có nhập tay → uppercase chữ/số, validate 3-20 ký tự,
   * chặn trùng. Bỏ trống → tự sinh từ slug (+ hậu tố ngẫu nhiên nếu đụng).
   */
  private async resolveTenantCode(raw: string | undefined, slug: string): Promise<string> {
    const explicit = raw
      ?.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (explicit) {
      if (explicit.length < 3 || explicit.length > 20)
        throw new BadRequestException({
          code: "INVALID_CODE",
          message: "Mã trường gồm 3-20 ký tự chữ/số",
        });
      const taken = await this.prisma.system.tenant.findFirst({
        where: { code: explicit, deletedAt: null },
        select: { id: true },
      });
      if (taken)
        throw new ConflictException({ code: "CODE_TAKEN", message: "Mã trường đã được dùng" });
      return explicit;
    }
    const base =
      slug
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 16) || "TENANT";
    let candidate = base;
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.system.tenant.findFirst({
        where: { code: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${base}${randomBytes(2).toString("hex").toUpperCase()}`;
    }
    return `${base}${randomBytes(3).toString("hex").toUpperCase()}`;
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

    const selectedPlanCode = (input.planCode ?? "free").trim().toLowerCase();
    const selectedCycle = input.billingCycle ?? BillingCycle.MONTHLY;
    const selectedPlan = await this.prisma.system.plan.findFirst({
      where: { code: selectedPlanCode, isPublic: true, isActive: true, deletedAt: null },
      include: { prices: { where: { isActive: true } } },
    });
    if (!selectedPlan) {
      throw new BadRequestException({ code: "INVALID_PLAN", message: "Gói không hợp lệ" });
    }
    const selectedPrice = selectedPlan.prices.find(
      (p) => p.billingCycle === selectedCycle && p.currency === BillingCurrency.VND,
    );
    const isPaidSignup = selectedPlan.code !== "free";
    if (isPaidSignup && (!selectedPrice || Number(selectedPrice.amount) <= 0)) {
      throw new BadRequestException({
        code: "NO_PUBLIC_PRICE",
        message: "Gói này cần liên hệ tư vấn để báo giá",
      });
    }

    const code = await this.resolveTenantCode(input.code, input.slug);

    const passwordHash = await hashPassword(input.adminPassword);
    const now = new Date();
    // Freemium: gói Miễn phí dùng vĩnh viễn (ACTIVE), không có hạn dùng thử.
    const periodEnd = new Date(now.getTime() + 100 * 365 * 86_400_000);
    const host = this.hostFor(input.slug);

    try {
      const created = await this.prisma.system.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug: input.slug,
            code,
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
            code: tenant.code,
            host,
            status: tenant.status,
            trialEndsAt: null,
          },
          school: { id: school.id },
          admin: { id: admin.id, email: admin.email },
          subscription: { id: subscription.id, status: subscription.status },
          selectedPlan: {
            code: selectedPlan.code,
            name: selectedPlan.name,
            tier: selectedPlan.tier,
            billingCycle: selectedCycle,
            amount: selectedPrice ? Number(selectedPrice.amount) : 0,
          },
        };
      });

      if (!isPaidSignup) return created;

      const invoice = await this.billing.createSignupUpgradeInvoice(
        created.tenant.id,
        selectedPlan.code,
        selectedCycle,
      );
      return {
        ...created,
        upgradeInvoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: Number(invoice.total),
          amountDue: Number(invoice.total) - Number(invoice.amountPaid),
          publicToken: invoice.publicToken,
        },
        publicInvoiceUrl: `/hoa-don/${invoice.publicToken}`,
      };
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

  /**
   * Danh sách trường công khai để CHỌN ở màn login (độc lập subdomain). Mặc định (q rỗng) trả
   * danh sách để hiện thẳng trong dropdown; có q → lọc thêm theo tên/mã trường/MST. Chỉ trả field
   * an toàn (logo/tên/MST/mã/domain) — KHÔNG lộ gói/email/bank. Cap 50 để giới hạn payload.
   */
  async searchTenants(q: string) {
    const term = (q ?? "").trim();
    const ci = { contains: term, mode: "insensitive" as const };
    const tenants = await this.prisma.system.tenant.findMany({
      where: {
        deletedAt: null,
        status: { not: TenantStatus.SUSPENDED },
        ...(term
          ? {
              OR: [
                { legalName: ci },
                { code: ci },
                { taxCode: ci },
                { settings: { is: { displayName: ci } } },
              ],
            }
          : {}),
      },
      take: 50,
      orderBy: { legalName: "asc" },
      select: {
        id: true,
        code: true,
        slug: true,
        legalName: true,
        settings: { select: { displayName: true, logoUrl: true } },
        domains: {
          where: { status: "ACTIVE", isPrimary: true },
          select: { host: true },
          take: 1,
        },
      },
    });
    // Cho tìm theo MST (nằm trong OR filter) NHƯNG không trả MST ra payload — tránh thu thập
    // hàng loạt qua endpoint công khai. Item chỉ hiện tên/mã trường/logo để chọn ở login.
    return tenants.map((t) => ({
      id: t.id,
      code: t.code,
      slug: t.slug,
      displayName: t.settings?.displayName ?? t.legalName,
      logoUrl: t.settings?.logoUrl ?? null,
      primaryDomain: t.domains[0]?.host ?? null,
    }));
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
