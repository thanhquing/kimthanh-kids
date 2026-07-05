import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { RequireFeature } from "../common/decorators/entitlement.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AlbumsService } from "./albums.service";

const createSchema = z.object({
  classroomId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});
const photosSchema = z.object({
  photos: z
    .array(z.object({ mediaId: z.string().uuid(), caption: z.string().max(200).optional() }))
    .min(1),
});

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
] as const;
const EDITORS = [TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL, TenantRole.TEACHER] as const;
const VIEWERS = [...STAFF, TenantRole.PARENT] as const;

@ApiTags("albums")
@RequireFeature("media_gallery") // gói phải bật media_gallery (Starter+)
@Controller("albums")
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Roles(...EDITORS)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.albums.create(user, dto);
  }

  @Roles(...EDITORS)
  @Post(":id/photos")
  addPhotos(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(photosSchema)) dto: z.infer<typeof photosSchema>,
  ) {
    return this.albums.addPhotos(user, id, dto.photos);
  }

  @Roles(...VIEWERS)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("classroomId") classroomId?: string) {
    return this.albums.list(user, { classroomId });
  }

  @Roles(...VIEWERS)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.albums.get(user, id);
  }

  @Roles(...EDITORS)
  @Delete("photos/:photoId")
  removePhoto(@CurrentUser() user: AuthUser, @Param("photoId") photoId: string) {
    return this.albums.removePhoto(user, photoId);
  }

  @Roles(...EDITORS)
  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.albums.remove(user, id);
  }
}
