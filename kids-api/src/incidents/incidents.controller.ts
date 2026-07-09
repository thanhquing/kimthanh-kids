import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IncidentSeverity, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
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
const listQuery = paginationQuerySchema.extend({
  studentId: z.string().uuid().optional(),
});

// FINANCE (kế toán) KHÔNG có quyền trên dữ liệu sức khỏe/sự cố trẻ (least-privilege) — chỉ vận hành học phí.
const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
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
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.incidents.list(user, query);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId")
  studentFeed(
    @CurrentUser() user: AuthUser,
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.infer<typeof paginationQuerySchema>,
  ) {
    return this.incidents.studentFeed(user, studentId, query);
  }
}
