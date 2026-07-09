import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PickupAuthorizationStatus, PickupEventType, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PickupService } from "./pickup.service";

const createAuthorizationSchema = z.object({
  studentId: z.string().uuid(),
  parentUserId: z.string().uuid().optional(),
  guardianName: z.string().min(1).max(120),
  guardianPhone: z.string().min(8).max(20),
  relationship: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

const listAuthorizationsQuerySchema = paginationQuerySchema.extend({
  studentId: z.string().uuid().optional(),
  status: z.nativeEnum(PickupAuthorizationStatus).optional(),
});

const listLogsQuerySchema = paginationQuerySchema.extend({
  studentId: z.string().uuid().optional(),
});

const createLogSchema = z
  .object({
    studentId: z.string().uuid().optional(),
    authorizationId: z.string().uuid().optional(),
    eventType: z.nativeEnum(PickupEventType),
    guardianName: z.string().max(120).optional(),
    guardianPhone: z.string().max(20).optional(),
    note: z.string().max(500).optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .refine((d) => Boolean(d.studentId || d.authorizationId), {
    message: "Cần studentId hoặc authorizationId",
    path: ["studentId"],
  });

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
] as const;
const VIEWERS = [...STAFF, TenantRole.PARENT] as const;

@ApiTags("pickup")
@Controller("pickup")
export class PickupController {
  constructor(private readonly pickup: PickupService) {}

  @Roles(...VIEWERS)
  @Get("authorizations")
  authorizations(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAuthorizationsQuerySchema))
    query: z.infer<typeof listAuthorizationsQuerySchema>,
  ) {
    return this.pickup.listAuthorizations(user, query);
  }

  @Roles(...STAFF)
  @Post("authorizations")
  createAuthorization(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAuthorizationSchema))
    dto: z.infer<typeof createAuthorizationSchema>,
  ) {
    return this.pickup.createAuthorization(user, dto);
  }

  @Roles(...STAFF)
  @Patch("authorizations/:id/revoke")
  revokeAuthorization(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.pickup.revokeAuthorization(user, id);
  }

  @Roles(...VIEWERS)
  @Get("logs")
  logs(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listLogsQuerySchema))
    query: z.infer<typeof listLogsQuerySchema>,
  ) {
    return this.pickup.listLogs(user, query);
  }

  @Roles(...STAFF)
  @Post("logs")
  createLog(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createLogSchema)) dto: z.infer<typeof createLogSchema>,
  ) {
    return this.pickup.createLog(user, dto);
  }
}
