import { BadRequestException, Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TuitionPaymentMethod } from "@prisma/client";
import { Public } from "../common/decorators/public.decorator";
import { TuitionPaymentService } from "./tuition-payment.service";

@ApiTags("tuition-webhooks")
@Public()
@Controller("tuition/webhooks")
export class TuitionWebhookController {
  constructor(private readonly payments: TuitionPaymentService) {}

  @Post(":method")
  handle(
    @Param("method") method: string,
    @Body() payload: Record<string, unknown>,
    @Headers("x-signature") signature?: string,
  ) {
    const m = method.toUpperCase() as TuitionPaymentMethod;
    if (m !== TuitionPaymentMethod.VNPAY) {
      throw new BadRequestException({
        code: "UNSUPPORTED_PROVIDER",
        message: "Nhà cung cấp thanh toán chưa được hỗ trợ",
      });
    }
    return this.payments.handleWebhook(m, payload, signature ?? (payload.signature as string));
  }
}
