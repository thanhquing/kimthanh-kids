import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PlatformRole } from "@prisma/client";
import { BillingService } from "../billing/billing.service";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { PlatformRoles } from "../common/decorators/roles.decorator";
import { MrrSnapshotService } from "./mrr-snapshot.service";
import {
  CreateCouponInput,
  CreatePlanInput,
  PlatformCreateTenantInput,
  PlatformService,
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
  listTenants(
    @Query("page") page?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    return this.platform.listTenants(Number(page) || 1, 20, status, q);
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
  setEntitlement(@Param("id") id: string, @Body() body: Record<string, never>) {
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
  listSubscriptions(@Query("page") page?: string, @Query("status") status?: string) {
    return this.platform.listSubscriptions(Number(page) || 1, 20, status);
  }

  @Get("invoices")
  listInvoices(
    @Query("page") page?: string,
    @Query("tenantId") tenantId?: string,
    @Query("status") status?: string,
  ) {
    return this.platform.listInvoices(Number(page) || 1, 20, tenantId, status);
  }

  @Post("invoices")
  createInvoice(@Body() body: { tenantId: string }) {
    return this.billing.createPeriodInvoice(body.tenantId);
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

  @Get("coupons")
  listCoupons(@Query("page") page?: string, @Query("isActive") isActive?: string) {
    return this.platform.listCoupons(Number(page) || 1, 20, isActive);
  }

  @Post("coupons")
  createCoupon(@Body() body: CreateCouponInput) {
    return this.platform.createCoupon(body);
  }
}
