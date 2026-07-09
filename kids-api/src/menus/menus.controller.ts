import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MealType, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { MenusService } from "./menus.service";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const createSchema = z.object({
  weekStart: DATE,
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
  meals: z
    .array(
      z.object({
        weekday: z.number().int().min(1).max(7),
        mealType: z.nativeEnum(MealType),
        name: z.string().min(1).max(300),
        ingredients: z.string().max(500).optional(),
      }),
    )
    .min(1),
});

const listQuery = paginationQuerySchema.extend({
  weekStart: DATE.optional(),
  classroomId: z.string().uuid().optional(),
});
const warningsQuery = z.object({ studentId: z.string().uuid() });

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const EDITORS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.NURSE] as const;
const VIEWERS = [...STAFF, TenantRole.PARENT] as const;

@ApiTags("menus")
@Controller("menus")
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Roles(...EDITORS)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.menus.create(user, dto);
  }

  @Roles(...VIEWERS)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>,
  ) {
    return this.menus.list(user, q);
  }

  @Roles(...VIEWERS)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.menus.get(user, id);
  }

  // Cảnh báo dị ứng cho 1 học sinh trên thực đơn (đối chiếu Allergy của bé).
  @Roles(...VIEWERS)
  @Get(":id/allergy-warnings")
  allergyWarnings(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(warningsQuery)) q: z.infer<typeof warningsQuery>,
  ) {
    return this.menus.allergyWarnings(user, id, q.studentId);
  }

  @Roles(...EDITORS)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.menus.remove(user, id);
  }
}
