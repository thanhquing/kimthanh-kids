import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IncidentSeverity, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { IncidentsService } from "./incidents.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const createSchema = z.object({
  studentId: z.string().uuid(),
  date: DATE,
  type: z.string().min(1).max(100),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  description: z.string().min(1).max(2000),
  actionTaken: z.string().max(2000).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const REPORTERS = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
] as const;

@ApiTags("incidents")
@Controller("incidents")
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Roles(...REPORTERS)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.incidents.create(user, dto);
  }

  @Roles(...STAFF)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("studentId") studentId?: string) {
    return this.incidents.list(user, { studentId });
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId")
  studentFeed(@CurrentUser() user: AuthUser, @Param("studentId") studentId: string) {
    return this.incidents.studentFeed(user, studentId);
  }
}
