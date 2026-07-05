import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { MediaKind, TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { MediaService, UploadFile } from "./media.service";

const STAFF = [
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
] as const;

const uploadQuery = z.object({
  kind: z.nativeEnum(MediaKind).optional(),
  schoolId: z.string().uuid().optional(),
});

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Roles(...STAFF)
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 15 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadFile,
    @Query(new ZodValidationPipe(uploadQuery)) q: z.infer<typeof uploadQuery>,
  ) {
    const m = await this.media.uploadImage(user, file, { kind: q.kind, schoolId: q.schoolId });
    return {
      id: m.id,
      url: `/api/media/${m.id}/file`,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      width: m.width,
      height: m.height,
    };
  }

  @Roles(...STAFF, TenantRole.PARENT)
  @Get(":id/file")
  async file(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<StreamableFile> {
    const { stream, mimeType } = await this.media.getReadable(user, id);
    return new StreamableFile(stream, { type: mimeType, disposition: "inline" });
  }
}
