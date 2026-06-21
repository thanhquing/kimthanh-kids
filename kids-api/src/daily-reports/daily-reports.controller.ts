import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Mood, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DailyReportsService } from "./daily-reports.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const upsertSchema = z.object({
  studentId: z.string().uuid(),
  date: DATE,
  mood: z.nativeEnum(Mood).optional(),
  meals: z.string().max(500).optional(),
  nap: z.string().max(500).optional(),
  activities: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;

@ApiTags("daily-reports")
@Controller("daily-reports")
export class DailyReportsController {
  constructor(private readonly reports: DailyReportsService) {}

  @Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER)
  @Post()
  upsert(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(upsertSchema)) dto: z.infer<typeof upsertSchema>,
  ) {
    return this.reports.upsert(user, dto);
  }

  @Roles(...STAFF)
  @Get()
  byClass(
    @CurrentUser() user: AuthUser,
    @Query("classroomId") classroomId: string,
    @Query("date") date: string,
  ) {
    return this.reports.listByClass(user, classroomId, date);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId")
  feed(@CurrentUser() user: AuthUser, @Param("studentId") studentId: string) {
    return this.reports.studentFeed(user, studentId);
  }
}
