import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { NotificationType, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { paginationQuerySchema } from "../common/http/pagination";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { NotificationsService } from "./notifications.service";

const feedQuery = paginationQuerySchema.extend({
  unreadOnly: z.enum(["true", "false"]).optional(),
});
const prefSchema = z.object({
  type: z.nativeEnum(NotificationType),
  enabled: z.boolean(),
});

// Thông báo là CÁ NHÂN (hộp thư của chính mình). Giới hạn cho user TENANT — chặn user PLATFORM
// (tenantId null) gọi setPreference gây lỗi; mọi vai trò tenant (gồm PARENT) đều dùng được.
@ApiTags("notifications")
@Roles(...Object.values(TenantRole))
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  feed(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(feedQuery)) q: z.infer<typeof feedQuery>,
  ) {
    return this.notifications.feed(user, { ...q, unreadOnly: q.unreadOnly === "true" });
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user);
  }

  @Get("preferences")
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.notifications.getPreferences(user);
  }

  @Patch("preferences")
  setPreference(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(prefSchema)) dto: z.infer<typeof prefSchema>,
  ) {
    return this.notifications.setPreference(user, dto.type, dto.enabled);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Post(":id/read")
  markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.markRead(user, id);
  }
}
