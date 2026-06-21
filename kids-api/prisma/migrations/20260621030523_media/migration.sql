-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('REPORT_PHOTO', 'ALBUM', 'AVATAR', 'DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT,
    "kind" "MediaKind" NOT NULL DEFAULT 'OTHER',
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "originalName" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_tenantId_idx" ON "media"("tenantId");
