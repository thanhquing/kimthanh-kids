import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { MrrSnapshotCron } from "./mrr-snapshot.cron";
import { MrrSnapshotService } from "./mrr-snapshot.service";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";

@Module({
  imports: [BillingModule, ProvisioningModule],
  controllers: [PlatformController],
  providers: [PlatformService, MrrSnapshotService, MrrSnapshotCron],
  exports: [MrrSnapshotService],
})
export class PlatformModule {}
