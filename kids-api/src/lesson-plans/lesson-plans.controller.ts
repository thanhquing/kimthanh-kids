import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { RequireFeature } from "../common/decorators/entitlement.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { LessonPlansService } from "./lesson-plans.service";

const createSchema = z.object({
  classroomId: z.string().uuid(),
  week: z.string().min(1).max(40),
  theme: z.string().min(1).max(200),
  note: z.string().max(1000).optional(),
  activities: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(1).max(7),
        startTime: z.string().max(10).optional(),
        title: z.string().min(1).max(200),
        materials: z.string().max(500).optional(),
      }),
    )
    .optional(),
});
const listQuery = paginationQuerySchema.extend({
  classroomId: z.string().uuid().optional(),
  week: z.string().min(1).max(40).optional(),
});

const EDITORS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER] as const;

@ApiTags("lesson-plans")
@RequireFeature("lesson_plan") // gói phải bật lesson_plan (Pro+)
@Roles(...EDITORS)
@Controller("lesson-plans")
export class LessonPlansController {
  constructor(private readonly plans: LessonPlansService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.plans.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.plans.list(user, query);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.plans.get(user, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.plans.remove(user, id);
  }
}
