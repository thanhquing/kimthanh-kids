import { Module } from "@nestjs/common";
import { PlatformConfigService } from "./platform-config.service";

// PrismaModule + ConfigModule là @Global → không cần import lại.
@Module({
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
