import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MedicineStatus, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { MedicineService } from "./medicine.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const createSchema = z.object({
  studentId: z.string().uuid(),
  medicineName: z.string().min(1).max(200),
  dosage: z.string().min(1).max(200),
  schedule: z.string().min(1).max(200),
  startDate: DATE,
  endDate: DATE,
  reason: z.string().max(500).optional(),
});
const handleSchema = z.object({
  status: z.nativeEnum(MedicineStatus),
  note: z.string().max(500).optional(),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const HANDLERS = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.NURSE,
  TenantRole.TEACHER,
] as const;

@ApiTags("medicine")
@Controller("medicine")
export class MedicineController {
  constructor(private readonly medicine: MedicineService) {}

  @Roles(...STAFF, TenantRole.PARENT)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.medicine.create(user, dto);
  }

  @Roles(TenantRole.PARENT)
  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.medicine.listMine(user);
  }

  @Roles(...STAFF)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("status") status?: MedicineStatus) {
    return this.medicine.listForStaff(user, status);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.medicine.get(user, id);
  }

  @Roles(...HANDLERS)
  @Post(":id/handle")
  handle(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(handleSchema)) dto: z.infer<typeof handleSchema>,
  ) {
    return this.medicine.handle(user, id, dto.status, dto.note);
  }
}
