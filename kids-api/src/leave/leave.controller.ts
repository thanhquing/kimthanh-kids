import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LeaveStatus, LeaveType, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { LeaveService } from "./leave.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const createSchema = z.object({
  studentId: z.string().uuid(),
  leaveType: z.nativeEnum(LeaveType),
  startDate: DATE,
  endDate: DATE,
  reason: z.string().max(1000).optional(),
  attachmentUrl: z.string().url().max(500).optional(),
});
const decideSchema = z.object({
  status: z.nativeEnum(LeaveStatus),
  note: z.string().max(500).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const APPROVERS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER] as const;

@ApiTags("leave")
@Controller("leave")
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Roles(...STAFF, TenantRole.PARENT)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.leave.create(user, dto);
  }

  @Roles(TenantRole.PARENT)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.leave.listMine(user);
  }

  @Roles(...STAFF)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("status") status?: LeaveStatus) {
    return this.leave.listForStaff(user, status);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.leave.get(user, id);
  }

  @Roles(...APPROVERS)
  @Post(":id/decide")
  decide(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(decideSchema)) dto: z.infer<typeof decideSchema>,
  ) {
    return this.leave.decide(user, id, dto.status, dto.note);
  }
}
