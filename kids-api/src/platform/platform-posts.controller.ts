import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PlatformRole, PostStatus } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { PlatformRoles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PlatformPostsService } from "./platform-posts.service";

const listPlatformQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).optional(),
  status: z.nativeEnum(PostStatus).optional(),
  q: z.string().max(120).optional(),
});

const listPublicQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  category: z.string().max(80).optional(),
  tag: z.string().max(60).optional(),
});

const postSchema = z.object({
  slug: z.string().min(3).max(160),
  title: z.string().min(2).max(220),
  excerpt: z.string().max(500).nullable().optional(),
  contentMarkdown: z.string().min(1),
  coverImageUrl: z.string().max(500).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().max(60)).optional(),
  status: z.nativeEnum(PostStatus).optional(),
  seoTitle: z.string().max(220).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

const patchPostSchema = postSchema.partial();

@ApiTags("platform-posts")
@PlatformRoles(PlatformRole.PLATFORM_SUPER_ADMIN, PlatformRole.PLATFORM_SUPPORT)
@Controller("platform/posts")
export class PlatformPostsController {
  constructor(private readonly posts: PlatformPostsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listPlatformQuery)) q: z.infer<typeof listPlatformQuery>) {
    return this.posts.listPlatform(q.page ?? 1, 20, q.status, q.q);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(postSchema)) body: z.infer<typeof postSchema>,
  ) {
    return this.posts.create(body, user.id);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.posts.get(id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(patchPostSchema)) body: z.infer<typeof patchPostSchema>,
  ) {
    return this.posts.update(id, body, user.id);
  }

  @Post(":id/publish")
  publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.posts.publish(id, user.id);
  }

  @Post(":id/unpublish")
  unpublish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.posts.unpublish(id, user.id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.posts.softDelete(id, user.id);
  }
}

@ApiTags("public")
@Public()
@Controller("public/posts")
export class PublicPostsController {
  constructor(private readonly posts: PlatformPostsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listPublicQuery)) q: z.infer<typeof listPublicQuery>) {
    return this.posts.listPublic(q.page ?? 1, q.pageSize ?? 12, q.category, q.tag);
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.posts.getPublic(slug);
  }
}
