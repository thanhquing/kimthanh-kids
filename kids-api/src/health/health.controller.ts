import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { HealthService } from "./health.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const createSchema = z
  .object({
    studentId: z.string().uuid(),
    date: DATE,
    heightCm: z.number().positive().max(250).optional(),
    weightKg: z.number().positive().max(150).optional(),
    temperatureC: z.number().min(30).max(45).optional(),
    note: z.string().max(500).optional(),
  })
  .refine((d) => d.heightCm != null || d.weightKg != null || d.temperatureC != null, {
    message: "Cần ít nhất một chỉ số (chiều cao/cân nặng/thân nhiệt)",
  });

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.NURSE, TenantRole.TEACHER)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.health.create(user, dto);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId")
  records(@CurrentUser() user: AuthUser, @Param("studentId") studentId: string) {
    return this.health.studentRecords(user, studentId);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId/growth")
  growth(@CurrentUser() user: AuthUser, @Param("studentId") studentId: string) {
    return this.health.growth(user, studentId);
  }
}
