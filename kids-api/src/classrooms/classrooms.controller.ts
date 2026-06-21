import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { CheckQuota } from "../common/decorators/entitlement.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ClassroomsService } from "./classrooms.service";

const createSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(1).max(120),
  ageGroup: z.string().max(40).optional(),
  capacity: z.number().int().positive().max(200).optional(),
  homeroomTeacherId: z.string().uuid().optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  ageGroup: z.string().max(40).optional(),
  capacity: z.number().int().positive().max(200).optional(),
  homeroomTeacherId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

@ApiTags("classrooms")
@Controller("classrooms")
export class ClassroomsController {
  constructor(private readonly classrooms: ClassroomsService) {}

  @Roles(
    TenantRole.SCHOOL_ADMIN,
    TenantRole.PRINCIPAL,
    TenantRole.TEACHER,
    TenantRole.NURSE,
    TenantRole.FINANCE,
  )
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("schoolId") schoolId?: string) {
    return this.classrooms.list(user, schoolId);
  }

  @Roles(
    TenantRole.SCHOOL_ADMIN,
    TenantRole.PRINCIPAL,
    TenantRole.TEACHER,
    TenantRole.NURSE,
    TenantRole.FINANCE,
  )
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.classrooms.get(user, id);
  }

  @Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL)
  @CheckQuota("CLASSROOMS")
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.classrooms.create(user, dto);
  }

  @Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) dto: z.infer<typeof updateSchema>,
  ) {
    return this.classrooms.update(user, id, dto);
  }

  @Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.classrooms.remove(user, id);
  }
}
