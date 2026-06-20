import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingCron } from "./billing.cron";
import { BillingJobsService } from "./billing-jobs.service";
import { BillingService } from "./billing.service";
import { LifecycleService } from "./lifecycle.service";
import { PaymentService } from "./payment.service";
import { WebhookController } from "./webhook.controller";

@Module({
  controllers: [BillingController, WebhookController],
  providers: [BillingService, PaymentService, LifecycleService, BillingJobsService, BillingCron],
  exports: [BillingService, LifecycleService, BillingJobsService, PaymentService],
})
export class BillingModule {}
