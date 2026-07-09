import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Gender, StudentStatus, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { CheckQuota } from "../common/decorators/entitlement.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StudentsService } from "./students.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD");
const guardianSchema = z.object({
  parentId: z.string().uuid(),
  relationship: z.string().min(1).max(40),
  isPrimary: z.boolean().optional(),
});
const createSchema = z.object({
  schoolId: z.string().uuid(),
  classroomId: z.string().uuid().optional(),
  fullName: z.string().min(1).max(120),
  nickname: z.string().max(60).optional(),
  dateOfBirth: DATE,
  gender: z.nativeEnum(Gender),
  avatarUrl: z.string().url().optional(),
  guardians: z.array(guardianSchema).optional(),
});
const updateSchema = z.object({
  classroomId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(1).max(120).optional(),
  nickname: z.string().max(60).optional(),
  dateOfBirth: DATE.optional(),
  gender: z.nativeEnum(Gender).optional(),
  avatarUrl: z.string().url().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
});
const mineQuery = paginationQuerySchema;
const listQuery = paginationQuerySchema.extend({
  classroomId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  gender: z.nativeEnum(Gender).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const EDITORS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER] as const;

@ApiTags("students")
@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Roles(TenantRole.PARENT)
  @Get("mine")
  mine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(mineQuery)) q: z.infer<typeof mineQuery>,
  ) {
    return this.students.myChildren(user, q);
  }

  @Roles(...STAFF)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>,
  ) {
    return this.students.list(user, q);
  }

  @Roles(...STAFF)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.students.get(user, id);
  }

  @Roles(...EDITORS)
  @CheckQuota("STUDENTS")
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.students.create(user, dto);
  }

  @Roles(...EDITORS)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSchema)) dto: z.infer<typeof updateSchema>,
  ) {
    return this.students.update(user, id, dto);
  }

  @Roles(...EDITORS)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.students.remove(user, id);
  }

  @Roles(...EDITORS)
  @Post(":id/guardians")
  addGuardian(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(guardianSchema)) dto: z.infer<typeof guardianSchema>,
  ) {
    return this.students.addGuardian(user, id, dto);
  }

  @Roles(...EDITORS)
  @Delete(":id/guardians/:parentId")
  removeGuardian(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("parentId") parentId: string,
  ) {
    return this.students.removeGuardian(user, id, parentId);
  }
}
