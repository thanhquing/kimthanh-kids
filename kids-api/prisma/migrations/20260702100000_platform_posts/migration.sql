-- Nội dung landing/blog quản lý từ Platform Console, public đọc qua /public/posts.
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "platform_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "platform_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_posts_slug_key" ON "platform_posts"("slug");
CREATE INDEX "platform_posts_status_publishedAt_idx" ON "platform_posts"("status", "publishedAt");
CREATE INDEX "platform_posts_deletedAt_idx" ON "platform_posts"("deletedAt");
