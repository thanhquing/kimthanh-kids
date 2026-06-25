import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { MrrSnapshotCron } from "./mrr-snapshot.cron";
import { MrrSnapshotService } from "./mrr-snapshot.service";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";
import { PublicInvoiceController } from "./public-invoice.controller";

@Module({
  imports: [BillingModule, ProvisioningModule, PlatformConfigModule],
  controllers: [PlatformController, PublicInvoiceController],
  providers: [PlatformService, MrrSnapshotService, MrrSnapshotCron],
  exports: [MrrSnapshotService],
})
export class PlatformModule {}
