import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  LimitMetric,
  PlanTier,
  PlatformInvoiceStatus,
  PlatformRole,
  SubscriptionStatus,
  TenantStatus,
} from "@prisma/client";
import { z } from "zod";
import { BillingService } from "../billing/billing.service";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { PlatformRoles } from "../common/decorators/roles.decorator";
import { MAX_PAGE } from "../common/http/pagination";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { UpdatePlatformConfigInput } from "../platform-config/platform-config.service";

const entitlementSchema = z.object({
  featureKey: z.string().optional(),
  enabled: z.boolean().optional(),
  metric: z.nativeEnum(LimitMetric).optional(),
  limitValue: z.number().int().nullable().optional(),
  reason: z.string().optional(),
});

// Query filter cho các trang list nền tảng — validate enum/uuid ở biên để tránh 500
// (Prisma nhận enum/uuid sai kiểu) và chặn filter tùy tiện; trả 400 khi sai.
const pageField = z.coerce.number().int().min(1).max(MAX_PAGE).optional();
const searchField = z.string().trim().min(1).max(120).optional();

const listTenantsQuery = z.object({
  page: pageField,
  status: z.nativeEnum(TenantStatus).optional(),
  q: searchField,
  planTier: z.nativeEnum(PlanTier).optional(),
  quota: z.enum(["at-risk"]).optional(),
});

const listSubscriptionsQuery = z.object({
  page: pageField,
  status: z.nativeEnum(SubscriptionStatus).optional(),
});

const listInvoicesQuery = z.object({
  page: pageField,
  tenantId: z.string().uuid().optional(),
  status: z.nativeEnum(PlatformInvoiceStatus).optional(),
  q: searchField,
});

const listCouponsQuery = z.object({
  page: pageField,
  isActive: z.enum(["true", "false"]).optional(),
});

const listAuditQuery = z.object({
  page: pageField,
  tenantId: z.string().uuid().optional(),
  action: searchField,
});
import { MrrSnapshotService } from "./mrr-snapshot.service";
import {
  CreateCouponInput,
  CreatePlanInput,
  PlatformCreateTenantInput,
  PlatformService,
  UpdatePlanInput,
} from "./platform.service";

@ApiTags("platform-admin")
@PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN, PlatformRole.PLATFORM_BILLING)
@Controller("platform")
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly billing: BillingService,
    private readonly mrr: MrrSnapshotService,
  ) {}

  @Get("overview")
  overview() {
    return this.platform.dashboard();
  }

  @Get("revenue")
  revenue(@Query("months") months?: string) {
    return this.platform.revenue(Number(months) || 12);
  }

  @PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN)
  @Post("mrr/backfill")
  async backfillMrr(@Query("months") months?: string) {
    const written = await this.mrr.backfill(Number(months) || 24);
    return { ok: true, written };
  }

  @Get("tenants")
  listTenants(@Query(new ZodValidationPipe(listTenantsQuery)) q: z.infer<typeof listTenantsQuery>) {
    return this.platform.listTenants(q.page ?? 1, 20, q.status, q.q, q.planTier, q.quota);
  }

  // Đặt TRƯỚC "tenants/:id" để route tĩnh không bị param ":id" nuốt.
  @Get("tenants/stats")
  tenantStats() {
    return this.platform.tenantStats();
  }

  @PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN)
  @Post("tenants")
  createTenant(@CurrentUser() user: AuthUser, @Body() body: PlatformCreateTenantInput) {
    return this.platform.createTenant(body, user.id);
  }

  @Get("tenants/:id")
  getTenant(@Param("id") id: string) {
    return this.platform.getTenant(id);
  }

  @Post("tenants/:id/suspend")
  async suspend(@Param("id") id: string) {
    await this.platform.suspend(id);
    return { ok: true };
  }

  @Post("tenants/:id/reactivate")
  async reactivate(@Param("id") id: string) {
    await this.platform.reactivate(id);
    return { ok: true };
  }

  @Post("tenants/:id/entitlements")
  setEntitlement(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(entitlementSchema)) body: z.infer<typeof entitlementSchema>,
  ) {
    return this.platform.setEntitlementOverride(id, body);
  }

  @PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN)
  @Post("tenants/:id/impersonate")
  impersonate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.platform.impersonateTenantAdmin(id, user.id);
  }

  @Get("subscriptions/stats")
  subscriptionStats() {
    return this.platform.subscriptionStats();
  }

  @Get("subscriptions")
  listSubscriptions(
    @Query(new ZodValidationPipe(listSubscriptionsQuery)) q: z.infer<typeof listSubscriptionsQuery>,
  ) {
    return this.platform.listSubscriptions(q.page ?? 1, 20, q.status);
  }

  @Get("invoices/stats")
  invoiceStats() {
    return this.platform.invoiceStats();
  }

  @Get("invoices")
  listInvoices(
    @Query(new ZodValidationPipe(listInvoicesQuery)) q: z.infer<typeof listInvoicesQuery>,
  ) {
    return this.platform.listInvoices(q.page ?? 1, 20, q.tenantId, q.status, q.q);
  }

  @Post("invoices")
  createInvoice(@Body() body: { tenantId: string }) {
    return this.billing.createPeriodInvoice(body.tenantId);
  }

  // Sau "invoices/stats" + "invoices" để route tĩnh không bị param ":id" nuốt.
  @Get("invoices/:id")
  getInvoice(@Param("id") id: string) {
    return this.platform.getInvoiceDetail(id);
  }

  @Post("invoices/:id/mark-paid")
  markPaid(@Param("id") id: string, @Body() body: { amount?: number }) {
    return this.billing.markInvoicePaid(id, body.amount ?? 0);
  }

  @Get("plans")
  listPlans() {
    return this.platform.listPlans();
  }

  @Post("plans")
  createPlan(@Body() body: CreatePlanInput) {
    return this.platform.createPlan(body);
  }

  @Patch("plans/:id")
  updatePlan(@Param("id") id: string, @Body() body: UpdatePlanInput) {
    return this.platform.updatePlan(id, body);
  }

  @Patch("plans/:id/feature")
  setPlanFeatured(@Param("id") id: string) {
    return this.platform.setPlanFeatured(id);
  }

  @Patch("plans/:id/deactivate")
  deactivatePlan(@Param("id") id: string) {
    return this.platform.deactivatePlan(id);
  }

  @Delete("plans/:id")
  deletePlan(@Param("id") id: string) {
    return this.platform.deletePlan(id);
  }

  @Get("coupons")
  listCoupons(@Query(new ZodValidationPipe(listCouponsQuery)) q: z.infer<typeof listCouponsQuery>) {
    return this.platform.listCoupons(q.page ?? 1, 20, q.isActive);
  }

  @Get("worklist")
  worklist() {
    return this.platform.worklist();
  }

  @Get("search")
  search(@Query("q") q?: string) {
    return this.platform.search(q);
  }

  @Get("settings")
  getSettings() {
    return this.platform.getSettings();
  }

  @PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN)
  @Patch("settings")
  updateSettings(@Body() body: UpdatePlatformConfigInput) {
    return this.platform.updateSettings(body);
  }

  @Get("audit")
  listAudit(@Query(new ZodValidationPipe(listAuditQuery)) q: z.infer<typeof listAuditQuery>) {
    return this.platform.listAudit(q.page ?? 1, 30, q.tenantId, q.action);
  }

  @Post("coupons")
  createCoupon(@Body() body: CreateCouponInput) {
    return this.platform.createCoupon(body);
  }
}
