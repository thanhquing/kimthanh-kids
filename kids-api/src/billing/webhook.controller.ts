import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PlatformPaymentProvider } from "@prisma/client";
import { Public } from "../common/decorators/public.decorator";
import { PaymentService } from "./payment.service";

@ApiTags("webhooks")
@Public()
@Controller("platform/webhooks")
export class WebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Post(":provider")
  handle(
    @Param("provider") provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers("x-signature") signature?: string,
  ) {
    const p = provider.toUpperCase() as PlatformPaymentProvider;
    return this.payments.handleWebhook(p, payload, signature ?? (payload.signature as string));
  }
}
