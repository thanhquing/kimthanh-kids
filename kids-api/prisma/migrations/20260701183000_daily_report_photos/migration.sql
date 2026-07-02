-- CreateTable
CREATE TABLE "daily_report_photos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_report_photos_tenantId_idx" ON "daily_report_photos"("tenantId");

-- CreateIndex
CREATE INDEX "daily_report_photos_reportId_sortOrder_idx" ON "daily_report_photos"("reportId", "sortOrder");

-- AddForeignKey
ALTER TABLE "daily_report_photos" ADD CONSTRAINT "daily_report_photos_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_photos" ADD CONSTRAINT "daily_report_photos_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
