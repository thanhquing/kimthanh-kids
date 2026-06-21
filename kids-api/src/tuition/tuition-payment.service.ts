import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { TuitionPaymentMethod, TuitionPaymentStatus } from "@prisma/client";
import { createHmac, randomUUID } from "node:crypto";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";
import { TuitionService } from "./tuition.service";
import { buildVietQrPayload, sanitizeAddInfo } from "./vietqr";

@Injectable()
export class TuitionPaymentService {
  private readonly logger = new Logger(TuitionPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly tuition: TuitionService,
  ) {}

  private async invoiceForStaff(user: AuthUser, invoiceId: string) {
    const inv = await this.prisma.db.tuitionInvoice.findFirst({
      where: { id: invoiceId, ...schoolWhere(user) },
    });
    if (!inv)
      throw new NotFoundException({ code: "NO_INVOICE", message: "Không tìm thấy hóa đơn" });
    return inv;
  }
  private async invoiceForViewer(user: AuthUser, invoiceId: string) {
    const inv = await this.prisma.db.tuitionInvoice.findFirst({
      where: { id: invoiceId, ...recordScopeWhere(user) },
    });
    if (!inv)
      throw new NotFoundException({ code: "NO_INVOICE", message: "Không tìm thấy hóa đơn" });
    return inv;
  }
  private remaining(inv: { total: unknown; amountPaid: unknown }): number {
    return Number(inv.total) - Number(inv.amountPaid);
  }

  /** Kế toán ghi nhận thanh toán thủ công (tiền mặt / chuyển khoản đã đối soát). */
  async recordManual(
    user: AuthUser,
    invoiceId: string,
    input: { method: "CASH" | "BANK_TRANSFER"; amount?: number; reference?: string },
  ) {
    const inv = await this.invoiceForStaff(user, invoiceId);
    if (inv.status === "PAID")
      throw new BadRequestException({ code: "ALREADY_PAID", message: "Hóa đơn đã thanh toán đủ" });
    if (inv.status === "CANCELED")
      throw new BadRequestException({ code: "CANCELED", message: "Hóa đơn đã hủy" });
    const remaining = this.remaining(inv);
    const amount = input.amount ?? remaining;
    if (amount <= 0)
      throw new BadRequestException({ code: "BAD_AMOUNT", message: "Số tiền không hợp lệ" });

    const payment = await this.prisma.db.tuitionPayment.create({
      data: {
        schoolId: inv.schoolId,
        invoiceId,
        method: input.method as TuitionPaymentMethod,
        status: TuitionPaymentStatus.SUCCEEDED,
        amount,
        reference: input.reference,
        paidAt: new Date(),
        recordedById: user.id,
      } as never,
    });
    await this.tuition.applyPayment(invoiceId, amount);
    return payment;
  }

  /** Sinh mã VietQR cho phần còn phải trả của hóa đơn (xem được bởi staff hoặc PH sở hữu). */
  async vietqr(user: AuthUser, invoiceId: string) {
    const inv = await this.invoiceForViewer(user, invoiceId);
    const remaining = this.remaining(inv);
    if (remaining <= 0)
      throw new BadRequestException({ code: "NOTHING_DUE", message: "Hóa đơn không còn nợ" });

    const settings = await this.prisma.system.tenantSettings.findUnique({
      where: { tenantId: user.tenantId! },
      select: { bankBin: true, bankAccountNumber: true, bankAccountName: true },
    });
    if (!settings?.bankBin || !settings.bankAccountNumber)
      throw new BadRequestException({
        code: "NO_BANK_CONFIG",
        message: "Trường chưa cấu hình tài khoản ngân hàng (VietQR)",
      });

    const addInfo = sanitizeAddInfo(inv.invoiceNumber);
    const payload = buildVietQrPayload({
      bankBin: settings.bankBin,
      accountNumber: settings.bankAccountNumber,
      amount: remaining,
      addInfo,
    });
    return {
      payload,
      bankBin: settings.bankBin,
      accountNumber: settings.bankAccountNumber,
      accountName: settings.bankAccountName,
      amount: remaining,
      addInfo,
    };
  }

  /** Khởi tạo thanh toán qua cổng (VNPay sandbox): tạo payment PENDING + redirectUrl. */
  async createGatewayPayment(user: AuthUser, invoiceId: string, method: "VNPAY") {
    const inv = await this.invoiceForViewer(user, invoiceId);
    if (inv.status === "PAID")
      throw new BadRequestException({ code: "ALREADY_PAID", message: "Hóa đơn đã thanh toán đủ" });
    const remaining = this.remaining(inv);
    if (remaining <= 0)
      throw new BadRequestException({ code: "NOTHING_DUE", message: "Hóa đơn không còn nợ" });

    const gatewayRef = randomUUID();
    const payment = await this.prisma.db.tuitionPayment.create({
      data: {
        schoolId: inv.schoolId,
        invoiceId,
        method: method as TuitionPaymentMethod,
        status: TuitionPaymentStatus.PENDING,
        amount: remaining,
        gatewayRef,
      } as never,
    });
    const redirectUrl = this.buildVnpayUrl(gatewayRef, remaining, inv.invoiceNumber);
    return { paymentId: payment.id, gatewayRef, redirectUrl };
  }

  /** Webhook/IPN cổng: verify chữ ký, idempotent theo (method, gatewayRef). */
  async handleWebhook(
    method: TuitionPaymentMethod,
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    if (!this.verifySignature(payload, signature))
      throw new BadRequestException({
        code: "INVALID_SIGNATURE",
        message: "Chữ ký webhook không hợp lệ",
      });

    const gatewayRef = payload.gatewayRef as string;
    const success = payload.success === true || payload.status === "SUCCEEDED";
    const payment = await this.prisma.system.tuitionPayment.findUnique({
      where: { method_gatewayRef: { method, gatewayRef } },
    });
    if (!payment) return { ok: true, ignored: true };
    if (payment.status === TuitionPaymentStatus.SUCCEEDED) return { ok: true, deduped: true };

    if (success) {
      await this.prisma.system.tuitionPayment.update({
        where: { id: payment.id },
        data: {
          status: TuitionPaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          rawPayload: payload as object,
        },
      });
      await this.tuition.applyPayment(payment.invoiceId, Number(payment.amount));
    } else {
      await this.prisma.system.tuitionPayment.update({
        where: { id: payment.id },
        data: { status: TuitionPaymentStatus.FAILED, rawPayload: payload as object },
      });
    }
    return { ok: true };
  }

  private verifySignature(payload: Record<string, unknown>, signature?: string): boolean {
    const secret = this.env.get("VNPAY_HASH_SECRET");
    if (!secret) return !this.env.isProd; // dev/test: chấp nhận khi chưa cấu hình secret
    const data = Object.keys(payload)
      .filter((k) => k !== "signature" && k !== "vnp_SecureHash")
      .sort()
      .map((k) => `${k}=${String(payload[k])}`)
      .join("&");
    const expected = createHmac("sha512", secret).update(data).digest("hex");
    return !!signature && signature.toLowerCase() === expected.toLowerCase();
  }

  private buildVnpayUrl(gatewayRef: string, amount: number, orderInfo: string): string {
    const ret = this.env.get("VNPAY_RETURN_URL") || "https://sandbox.vnpayment.vn/return";
    const params = new URLSearchParams({
      vnp_TxnRef: gatewayRef,
      vnp_Amount: String(Math.round(amount) * 100), // VNPay tính theo xu
      vnp_OrderInfo: orderInfo,
      vnp_ReturnUrl: ret,
    });
    return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${params.toString()}`;
  }
}
