import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuditService } from "./audit.service";

const listQuery = paginationQuerySchema.extend({
  action: z.string().max(100).optional(),
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
