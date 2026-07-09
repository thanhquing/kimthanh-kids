import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AttendanceStatus, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AttendanceService } from "./attendance.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const markSchema = z.object({
  classroomId: z.string().uuid(),
  date: DATE,
  entries: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.nativeEnum(AttendanceStatus),
        checkInAt: z.string().datetime().optional(),
        note: z.string().max(300).optional(),
      }),
    )
    .min(1),
});
const byClassQuery = paginationQuerySchema.extend({
  classroomId: z.string().uuid(),
  date: DATE,
});
const historyQuery = paginationQuerySchema;

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;

@ApiTags("attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER)
  @Post("mark")
  mark(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(markSchema)) dto: z.infer<typeof markSchema>,
  ) {
    return this.attendance.markBulk(user, dto);
  }

  @Roles(...STAFF)
  @Get()
  byClass(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(byClassQuery)) q: z.infer<typeof byClassQuery>,
  ) {
    return this.attendance.listByClass(user, q);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId")
  history(
    @CurrentUser() user: AuthUser,
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(historyQuery)) q: z.infer<typeof historyQuery>,
  ) {
    return this.attendance.studentHistory(user, studentId, q);
  }
}
