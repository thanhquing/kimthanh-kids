import { Module } from "@nestjs/common";
import { TuitionWebhookController } from "./tuition-webhook.controller";
import { TuitionPaymentService } from "./tuition-payment.service";
import { TuitionController } from "./tuition.controller";
import { TuitionService } from "./tuition.service";

@Module({
  controllers: [TuitionController, TuitionWebhookController],
  providers: [TuitionService, TuitionPaymentService],
  exports: [TuitionService, TuitionPaymentService],
})
export class TuitionModule {}
