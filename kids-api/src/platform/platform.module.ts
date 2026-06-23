import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";

@Module({
  imports: [BillingModule, ProvisioningModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
