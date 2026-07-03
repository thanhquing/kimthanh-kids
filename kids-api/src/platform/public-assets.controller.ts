import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { Public } from "../common/decorators/public.decorator";

const BLOG_ASSET_RE = /^[a-z0-9][a-z0-9-]*\.(avif|jpe?g|png|webp)$/;
const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

@ApiTags("public")
@Public()
@Controller("public/assets/blog")
export class PublicBlogAssetsController {
  @Get(":file")
  async getBlogAsset(
    @Param("file") file: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!BLOG_ASSET_RE.test(file)) {
      throw new NotFoundException({ code: "ASSET_NOT_FOUND", message: "Không tìm thấy asset" });
    }

    const path = join(process.cwd(), "public", "blog", file);
    try {
      await access(path);
    } catch {
      throw new NotFoundException({ code: "ASSET_NOT_FOUND", message: "Không tìm thấy asset" });
    }

    const ext = file.split(".").pop() ?? "";
    res.setHeader("Content-Type", CONTENT_TYPES[ext] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return new StreamableFile(createReadStream(path));
  }
}
