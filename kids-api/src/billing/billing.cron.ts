import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BillingJobsService } from "./billing-jobs.service";

/** Lịch chạy các job billing. Logic nằm ở BillingJobsService (test gọi trực tiếp). */
@Injectable()
export class BillingCron {
  constructor(private readonly jobs: BillingJobsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async hourly(): Promise<void> {
    await this.jobs.expireTrials();
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async daily(): Promise<void> {
    await this.jobs.markOverdueInvoices();
    await this.jobs.dunningSuspend();
    await this.jobs.dunningCancel();
  }
}
