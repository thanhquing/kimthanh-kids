import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole, TuitionInvoiceStatus } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { renderInvoiceHtml } from "./tuition-print";
import { TuitionPaymentService } from "./tuition-payment.service";
import { TuitionService } from "./tuition.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const createSchema = z.object({
  studentId: z.string().uuid(),
  period: z.string().min(1).max(40),
  issueDate: DATE.optional(),
  dueDate: DATE,
  discount: z.number().nonnegative().optional(),
  note: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        quantity: z.number().int().positive().max(999).optional(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1),
});
const manualSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER"]),
  amount: z.number().positive().optional(),
  reference: z.string().max(120).optional(),
});
const gatewaySchema = z.object({ method: z.enum(["VNPAY"]) });
const mineQuery = paginationQuerySchema;
const listQuery = paginationQuerySchema.extend({
  status: z.nativeEnum(TuitionInvoiceStatus).optional(),
  studentId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
});
const exportQuery = z.object({
  status: z.nativeEnum(TuitionInvoiceStatus).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const MANAGERS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.FINANCE] as const;
const VIEWERS = [...MANAGERS, TenantRole.PARENT] as const;

@ApiTags("tuition")
@Controller("tuition")
export class TuitionController {
  constructor(
    private readonly tuition: TuitionService,
    private readonly payments: TuitionPaymentService,
  ) {}

  // ─── Hóa đơn ───
  @Roles(...MANAGERS)
  @Post("invoices")
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.tuition.create(user, dto);
  }

  @Roles(TenantRole.PARENT)
  @Get("invoices/mine")
  mine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(mineQuery)) q: z.infer<typeof mineQuery>,
  ) {
    return this.tuition.myInvoices(user, q);
  }

  @Roles(...STAFF)
  @Get("invoices/export")
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query(new ZodValidationPipe(exportQuery)) q: z.infer<typeof exportQuery>,
  ) {
    const csv = await this.tuition.exportCsv(user, { status: q.status });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="hoa-don-hoc-phi.csv"');
    res.send(csv);
  }

  @Roles(...STAFF)
  @Get("invoices")
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>,
  ) {
    return this.tuition.list(user, q);
  }

  @Roles(...VIEWERS)
  @Get("invoices/:id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tuition.get(user, id);
  }

  // Bản in HTML chứng từ (xem online / in). Trả raw HTML (bỏ qua transform interceptor qua @Res).
  @Roles(...VIEWERS)
  @Get("invoices/:id/print")
  async print(@CurrentUser() user: AuthUser, @Param("id") id: string, @Res() res: Response) {
    const { invoice, org } = await this.tuition.printData(user, id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderInvoiceHtml(invoice as never, org as never));
  }

  @Roles(...MANAGERS)
  @Post("invoices/:id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tuition.cancel(user, id);
  }

  // ─── Thanh toán ───
  @Roles(...MANAGERS)
  @Post("invoices/:id/pay/manual")
  payManual(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(manualSchema)) dto: z.infer<typeof manualSchema>,
  ) {
    return this.payments.recordManual(user, id, dto);
  }

  @Roles(...VIEWERS)
  @Get("invoices/:id/vietqr")
  vietqr(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.payments.vietqr(user, id);
  }

  @Roles(...VIEWERS)
  @Post("invoices/:id/pay/gateway")
  payGateway(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(gatewaySchema)) dto: z.infer<typeof gatewaySchema>,
  ) {
    return this.payments.createGatewayPayment(user, id, dto.method);
  }
}
