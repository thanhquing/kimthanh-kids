import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AllergiesService } from "./allergies.service";

const createSchema = z.object({
  studentId: z.string().uuid(),
  allergen: z.string().min(1).max(200),
  note: z.string().max(500).optional(),
});

// FINANCE (kế toán) KHÔNG có quyền trên dữ liệu sức khỏe trẻ (least-privilege) — chỉ vận hành học phí.
const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
] as const;
const EDITORS = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.NURSE,
  TenantRole.TEACHER,
] as const;

@ApiTags("allergies")
@Controller("allergies")
export class AllergiesController {
  constructor(private readonly allergies: AllergiesService) {}

  @Roles(...EDITORS)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.allergies.create(user, dto);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("student/:studentId")
  byStudent(
    @CurrentUser() user: AuthUser,
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.infer<typeof paginationQuerySchema>,
  ) {
    return this.allergies.listByStudent(user, studentId, query);
  }

  @Roles(...EDITORS)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.allergies.remove(user, id);
  }
}
