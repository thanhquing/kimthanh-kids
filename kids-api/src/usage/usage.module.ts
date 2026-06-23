import { Global, Module } from "@nestjs/common";
import { UsageController } from "./usage.controller";
import { UsageService } from "./usage.service";

// @Global: AuthService inject để track login mà không tạo phụ thuộc vòng.
@Global()
@Module({
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
