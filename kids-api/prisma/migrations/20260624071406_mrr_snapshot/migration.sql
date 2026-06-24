-- CreateEnum
CREATE TYPE "MrrSnapshotSource" AS ENUM ('CRON', 'BACKFILL');

-- CreateTable
CREATE TABLE "mrr_snapshots" (
    "id" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "mrr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "activeSubs" INTEGER NOT NULL DEFAULT 0,
    "byTier" JSONB,
    "source" "MrrSnapshotSource" NOT NULL DEFAULT 'CRON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mrr_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mrr_snapshots_periodMonth_key" ON "mrr_snapshots"("periodMonth");

-- CreateIndex
CREATE INDEX "mrr_snapshots_periodMonth_idx" ON "mrr_snapshots"("periodMonth");
