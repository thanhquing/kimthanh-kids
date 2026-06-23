import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuditService } from "./audit.service";

const listQuery = z.object({
  action: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

@ApiTags("audit")
@Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>,
  ) {
    return this.audit.list(user, q);
  }
}
