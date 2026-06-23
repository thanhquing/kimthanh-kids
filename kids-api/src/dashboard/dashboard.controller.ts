import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user);
  }
}
