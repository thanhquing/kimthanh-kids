import { Global, Module } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

// @Global: domain service (tuition, students, tenant...) inject để ghi nhật ký hành động nhạy cảm.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
