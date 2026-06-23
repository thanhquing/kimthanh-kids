import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AnnouncementAudience, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AnnouncementsService } from "./announcements.service";

const createSchema = z.object({
  audience: z.nativeEnum(AnnouncementAudience),
  schoolId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  publish: z.boolean().optional(),
});

const listQuery = z.object({ audience: z.nativeEnum(AnnouncementAudience).optional() });

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
] as const;
const COMPOSERS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER] as const;

@ApiTags("announcements")
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Roles(...COMPOSERS)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.announcements.create(user, dto);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get("feed")
  feed(@CurrentUser() user: AuthUser) {
    return this.announcements.feed(user);
  }

  @Roles(...STAFF)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>,
  ) {
    return this.announcements.list(user, q);
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.announcements.get(user, id);
  }

  @Roles(...COMPOSERS)
  @Post(":id/publish")
  publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.announcements.publish(user, id);
  }

  @Roles(...COMPOSERS)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.announcements.remove(user, id);
  }
}
