import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { BillingCycle, PlatformPaymentProvider, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AllowInactive } from "../common/decorators/subscription.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "./billing.service";
import { PaymentService } from "./payment.service";

const changeSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.nativeEnum(BillingCycle),
});
const paySchema = z.object({ provider: z.nativeEnum(PlatformPaymentProvider) });

@ApiTags("billing")
@Roles(TenantRole.SCHOOL_ADMIN, TenantRole.FINANCE)
@Controller("billing")
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly payments: PaymentService,
    private readonly entitlements: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  @AllowInactive()
  @Get("plans")
  plans() {
    return this.billing.listPublicPlans();
  }

  @AllowInactive()
  @Get("subscription")
  subscription(@CurrentUser() user: AuthUser) {
    return this.billing.getSubscription(user.tenantId!);
  }

  @AllowInactive()
  @Get("usage")
  usage(@CurrentUser() user: AuthUser) {
    return this.entitlements.getUsage(user.tenantId!);
  }

  @AllowInactive()
  @Get("invoices")
  invoices() {
    // prisma.db (đã filter theo tenant theo ALS) — chỉ thấy hóa đơn của mình.
    return this.prisma.db.platformInvoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });
  }

  @Post("subscription/change")
  change(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changeSchema)) dto: z.infer<typeof changeSchema>,
  ) {
    return this.billing.changePlan(user.tenantId!, dto.planId, dto.billingCycle, user.id);
  }

  @Post("subscription/cancel")
  cancel(@CurrentUser() user: AuthUser, @Body() body: { atPeriodEnd?: boolean }) {
    return this.billing.cancel(user.tenantId!, body.atPeriodEnd ?? true, user.id);
  }

  @AllowInactive()
  @Post("invoices/:id/pay")
  pay(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(paySchema)) dto: z.infer<typeof paySchema>,
  ) {
    return this.payments.createPayment(user.tenantId!, id, dto.provider);
  }
}
