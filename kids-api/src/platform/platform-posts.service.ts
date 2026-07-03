import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PostStatus, Prisma, UserType } from "@prisma/client";
import { paginated } from "../common/http/api-response";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Field public an toàn cho trang chi tiết bài viết — không lộ id/authorId/timestamp nội bộ. */
const PUBLIC_POST_SELECT = {
  slug: true,
  title: true,
  excerpt: true,
  contentMarkdown: true,
  coverImageUrl: true,
  category: true,
  tags: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
} satisfies Prisma.PlatformPostSelect;

export type PlatformPostInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  contentMarkdown: string;
  coverImageUrl?: string | null;
  category?: string | null;
  tags?: string[];
  status?: PostStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
};

@Injectable()
export class PlatformPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  private cleanSlug(slug: string): string {
    const value = slug.trim().toLowerCase();
    if (!SLUG_RE.test(value)) {
      throw new BadRequestException({
        code: "INVALID_SLUG",
        message: "Slug bài viết chỉ gồm chữ thường, số và dấu gạch ngang",
      });
    }
    return value;
  }

  private toDate(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException({
        code: "INVALID_PUBLISHED_AT",
        message: "Ngày xuất bản không hợp lệ",
      });
    }
    return d;
  }

  private data(input: PlatformPostInput): Prisma.PlatformPostUncheckedCreateInput {
    return {
      slug: this.cleanSlug(input.slug),
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || null,
      contentMarkdown: input.contentMarkdown,
      coverImageUrl: input.coverImageUrl?.trim() || null,
      category: input.category?.trim() || null,
      tags: input.tags ?? [],
      status: input.status ?? PostStatus.DRAFT,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      publishedAt: this.toDate(input.publishedAt),
    };
  }

  private apiOrigin(): string {
    const host = this.env.get("API_HOST").replace(/\/$/, "");
    return /^https?:\/\//.test(host)
      ? host
      : this.env.isProd
        ? `https://${host}`
        : `http://localhost:${this.env.get("API_PORT")}`;
  }

  private apiBaseUrl(): string {
    const origin = this.apiOrigin();
    return `${origin}/${this.env.get("API_GLOBAL_PREFIX").replace(/^\/|\/$/g, "")}`;
  }

  private publicCoverUrl(value?: string | null): string | null {
    if (!value) return null;
    if (/^https?:\/\//.test(value)) return value;

    const base = this.apiBaseUrl();
    const apiPrefix = `/${this.env.get("API_GLOBAL_PREFIX").replace(/^\/|\/$/g, "")}/`;
    if (value.startsWith(apiPrefix)) return `${this.apiOrigin()}${value}`;
    if (value.startsWith("/public/assets/")) return `${base}${value}`;
    if (value.startsWith("/blog/")) return `${base}/public/assets${value}`;
    return `${base}/${value.replace(/^\//, "")}`;
  }

  private withPublicCoverUrl<T extends { coverImageUrl: string | null }>(post: T): T {
    return { ...post, coverImageUrl: this.publicCoverUrl(post.coverImageUrl) };
  }

  async listPlatform(page = 1, pageSize = 20, status?: PostStatus, q?: string) {
    const term = q?.trim();
    const where: Prisma.PlatformPostWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { slug: { contains: term, mode: "insensitive" } },
              { category: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.system.platformPost.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.system.platformPost.count({ where }),
    ]);
    return paginated(
      items.map((item) => this.withPublicCoverUrl(item)),
      { page, pageSize, total },
    );
  }

  private logAction(action: string, targetId: string, actorId?: string) {
    return this.prisma.system.auditLog.create({
      data: { actorId, actorType: UserType.PLATFORM, action, targetType: "PlatformPost", targetId },
    });
  }

  async create(input: PlatformPostInput, actorId?: string) {
    const post = await this.prisma.system.platformPost.create({ data: this.data(input) });
    await this.logAction("platform_post.create", post.id, actorId);
    return post;
  }

  async get(id: string) {
    const post = await this.prisma.system.platformPost.findFirst({
      where: { id, deletedAt: null },
    });
    if (!post)
      throw new NotFoundException({ code: "POST_NOT_FOUND", message: "Không tìm thấy bài viết" });
    return post;
  }

  async update(id: string, input: Partial<PlatformPostInput>, actorId?: string) {
    await this.get(id);
    const data: Prisma.PlatformPostUncheckedUpdateInput = {};
    if (input.slug !== undefined) data.slug = this.cleanSlug(input.slug);
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.excerpt !== undefined) data.excerpt = input.excerpt?.trim() || null;
    if (input.contentMarkdown !== undefined) data.contentMarkdown = input.contentMarkdown;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl?.trim() || null;
    if (input.category !== undefined) data.category = input.category?.trim() || null;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.status !== undefined) data.status = input.status;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle?.trim() || null;
    if (input.seoDescription !== undefined)
      data.seoDescription = input.seoDescription?.trim() || null;
    if (input.publishedAt !== undefined) data.publishedAt = this.toDate(input.publishedAt);

    const post = await this.prisma.system.platformPost.update({ where: { id }, data });
    await this.logAction("platform_post.update", post.id, actorId);
    return post;
  }

  async publish(id: string, actorId?: string) {
    await this.get(id);
    const post = await this.prisma.system.platformPost.update({
      where: { id },
      data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
    });
    await this.logAction("platform_post.publish", post.id, actorId);
    return post;
  }

  async unpublish(id: string, actorId?: string) {
    await this.get(id);
    const post = await this.prisma.system.platformPost.update({
      where: { id },
      data: { status: PostStatus.DRAFT },
    });
    await this.logAction("platform_post.unpublish", post.id, actorId);
    return post;
  }

  async softDelete(id: string, actorId?: string) {
    await this.get(id);
    const post = await this.prisma.system.platformPost.update({
      where: { id },
      data: { status: PostStatus.ARCHIVED, deletedAt: new Date() },
    });
    await this.logAction("platform_post.delete", post.id, actorId);
    return { ok: true };
  }

  async listPublic(page = 1, pageSize = 12, category?: string, tag?: string) {
    const now = new Date();
    const where: Prisma.PlatformPostWhereInput = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      ...(category ? { category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.system.platformPost.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          category: true,
          tags: true,
          publishedAt: true,
        },
      }),
      this.prisma.system.platformPost.count({ where }),
    ]);
    return paginated(items, { page, pageSize, total });
  }

  async getPublic(slug: string) {
    const now = new Date();
    const post = await this.prisma.system.platformPost.findFirst({
      where: {
        slug,
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
      select: PUBLIC_POST_SELECT,
    });
    if (!post)
      throw new NotFoundException({ code: "POST_NOT_FOUND", message: "Không tìm thấy bài viết" });
    return this.withPublicCoverUrl(post);
  }
}
