import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Shift, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AssignmentsService } from "./assignments.service";

const createSchema = z.object({
  staffId: z.string().uuid(),
  classroomId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  weekday: z.number().int().min(1).max(7),
  shift: z.nativeEnum(Shift),
  duty: z.string().min(1).max(100),
  note: z.string().max(300).optional(),
});
const updateSchema = z.object({
  classroomId: z.string().uuid().nullable().optional(),
  weekday: z.number().int().min(1).max(7).optional(),
  shift: z.nativeEnum(Shift).optional(),
  duty: z.string().min(1).max(100).optional(),
  note: z.string().max(300).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const MANAGERS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL] as const;

@ApiTags("assignments")
@Controller("assignments")
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  // Lịch phân công của chính nhân sự đang đăng nhập (app GV).
  @Roles(...STAFF)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.assignments.myschedule(user);
  }

  @Roles(...MANAGERS)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("staffId") staffId?: string,
    @Query("classroomId") classroomId?: string,
    @Query("weekday") weekday?: string,
  ) {
    return this.assignments.list(user, {
      staffId,
      classroomId,
      weekday: weekday ? Number(weekday) : undefined,
    });
  }

  @Roles(...MANAGERS)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.assignments.create(user, dto);
  }

  @Roles(...MANAGERS)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) dto: z.infer<typeof updateSchema>,
  ) {
    return this.assignments.update(user, id, dto);
  }

  @Roles(...MANAGERS)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.assignments.remove(user, id);
  }
}
