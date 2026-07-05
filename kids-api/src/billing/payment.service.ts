import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PlatformPaymentProvider, PlatformPaymentStatus } from "@prisma/client";
import { createHmac, randomUUID } from "node:crypto";
import { timingSafeEqualHex } from "../common/crypto/timing-safe";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "./billing.service";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly env: EnvService,
  ) {}

  /** Khởi tạo thanh toán cho hóa đơn. Trả gatewayRef + redirectUrl (VNPay). */
  async createPayment(tenantId: string, invoiceId: string, provider: PlatformPaymentProvider) {
    const invoice = await this.prisma.system.platformInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice)
      throw new NotFoundException({ code: "NO_INVOICE", message: "Không tìm thấy hóa đơn" });
    if (invoice.status === "PAID") {
      throw new BadRequestException({ code: "ALREADY_PAID", message: "Hóa đơn đã thanh toán" });
    }

    const gatewayRef = randomUUID();
    const payment = await this.prisma.system.platformPayment.create({
      data: {
        invoiceId,
        tenantId,
        provider,
        status: PlatformPaymentStatus.PENDING,
        amount: invoice.total,
        currency: invoice.currency,
        gatewayRef,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const redirectUrl =
      provider === PlatformPaymentProvider.VNPAY
        ? this.buildVnpayUrl(gatewayRef, Number(invoice.total))
        : null;

    return { paymentId: payment.id, gatewayRef, redirectUrl };
  }

  /** Xử lý webhook gateway: verify chữ ký, dedupe theo eventId, idempotent theo gatewayRef. */
  async handleWebhook(
    provider: PlatformPaymentProvider,
    payload: Record<string, unknown>,
    signature?: string,
  ) {
    // Verify chữ ký TRƯỚC khi ghi bất cứ gì xuống DB → chặn attacker bơm phồng bảng
    // platform_webhook_events bằng eventId tùy ý (payload chưa xác thực không tạo row).
    if (!this.verifySignature(provider, payload, signature)) {
      throw new BadRequestException({
        code: "INVALID_SIGNATURE",
        message: "Chữ ký webhook không hợp lệ",
      });
    }

    const eventId = (payload.eventId as string) ?? (payload.gatewayRef as string) ?? randomUUID();

    // Dedupe (replay): đã xử lý event này → bỏ qua.
    const existing = await this.prisma.system.platformWebhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
    });
    if (existing?.processed) return { ok: true, deduped: true };

    const event =
      existing ??
      (await this.prisma.system.platformWebhookEvent.create({
        data: { provider, eventId, signature, payload: payload as object, verified: true },
      }));

    const gatewayRef = payload.gatewayRef as string;
    const success = payload.success === true || payload.status === "SUCCEEDED";

    const payment = await this.prisma.system.platformPayment.findFirst({
      where: { provider, gatewayRef },
    });
    if (payment && success && payment.status !== PlatformPaymentStatus.SUCCEEDED) {
      await this.prisma.system.platformPayment.update({
        where: { id: payment.id },
        data: {
          status: PlatformPaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          rawPayload: payload as object,
        },
      });
      await this.billing.markInvoicePaid(payment.invoiceId, payment.amount);
    } else if (payment && !success) {
      await this.prisma.system.platformPayment.update({
        where: { id: payment.id },
        data: { status: PlatformPaymentStatus.FAILED, rawPayload: payload as object },
      });
    }

    await this.prisma.system.platformWebhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    return { ok: true };
  }

  private verifySignature(
    provider: PlatformPaymentProvider,
    payload: Record<string, unknown>,
    signature?: string,
  ): boolean {
    const secret = this.env.get("VNPAY_HASH_SECRET");
    // Dev/test: chưa cấu hình secret → chấp nhận (KHÔNG dùng ở production thật).
    if (!secret) {
      if (this.env.isProd) return false;
      return true;
    }
    if (provider !== PlatformPaymentProvider.VNPAY) return false;
    const data = this.canonical(payload);
    const expected = createHmac("sha512", secret).update(data).digest("hex");
    return timingSafeEqualHex(signature, expected);
  }

  private canonical(payload: Record<string, unknown>): string {
    return Object.keys(payload)
      .filter((k) => k !== "signature" && k !== "vnp_SecureHash")
      .sort()
      .map((k) => `${k}=${String(payload[k])}`)
      .join("&");
  }

  private buildVnpayUrl(gatewayRef: string, amount: number): string {
    const ret = this.env.get("VNPAY_RETURN_URL") || "https://sandbox.vnpayment.vn/return";
    const payUrl = this.env.get("VNPAY_PAY_URL");
    return `${payUrl}?vnp_TxnRef=${gatewayRef}&vnp_Amount=${amount * 100}&vnp_ReturnUrl=${encodeURIComponent(ret)}`;
  }
}
