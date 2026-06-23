-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ATTENDANCE', 'DAILY_REPORT', 'ANNOUNCEMENT', 'INVOICE', 'MEDICINE', 'LEAVE', 'INCIDENT');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "linkType" TEXT,
    "linkId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_readAt_idx" ON "notifications"("tenantId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_createdAt_idx" ON "notifications"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_preferences_tenantId_idx" ON "notification_preferences"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_type_key" ON "notification_preferences"("userId", "type");

-- CreateIndex
CREATE INDEX "usage_events_tenantId_createdAt_idx" ON "usage_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "usage_events_type_createdAt_idx" ON "usage_events"("type", "createdAt");
