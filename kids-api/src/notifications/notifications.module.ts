import { Global, Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

// @Global: các domain service (daily-report, announcement, invoice...) inject để phát thông báo
// mà không phải import lặp ở từng module.
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
