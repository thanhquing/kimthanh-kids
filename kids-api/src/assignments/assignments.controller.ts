import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Shift, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
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
const mineQuery = paginationQuerySchema;
const listQuery = paginationQuerySchema.extend({
  staffId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  weekday: z.coerce.number().int().min(1).max(7).optional(),
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
  mine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(mineQuery)) q: z.infer<typeof mineQuery>,
  ) {
    return this.assignments.myschedule(user, q);
  }

  @Roles(...MANAGERS)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>,
  ) {
    return this.assignments.list(user, q);
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
