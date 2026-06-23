import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PlatformRole } from "@prisma/client";
import { PlatformRoles } from "../common/decorators/roles.decorator";
import { UsageService } from "./usage.service";

// Metric vận hành xuyên tenant → chỉ operator nền tảng.
@ApiTags("usage")
@PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN, PlatformRole.PLATFORM_BILLING)
@Controller("platform/usage")
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get("overview")
  overview() {
    return this.usage.overview();
  }
}
