-- CreateEnum
CREATE TYPE "PickupAuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "PickupEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateTable
CREATE TABLE "pickup_authorizations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentUserId" TEXT,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "relationship" TEXT,
    "note" TEXT,
    "status" "PickupAuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorizationId" TEXT,
    "eventType" "PickupEventType" NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pickup_authorizations_tenantId_idx" ON "pickup_authorizations"("tenantId");

-- CreateIndex
CREATE INDEX "pickup_authorizations_studentId_status_idx" ON "pickup_authorizations"("studentId", "status");

-- CreateIndex
CREATE INDEX "pickup_authorizations_schoolId_status_idx" ON "pickup_authorizations"("schoolId", "status");

-- CreateIndex
CREATE INDEX "pickup_logs_tenantId_idx" ON "pickup_logs"("tenantId");

-- CreateIndex
CREATE INDEX "pickup_logs_studentId_occurredAt_idx" ON "pickup_logs"("studentId", "occurredAt");

-- CreateIndex
CREATE INDEX "pickup_logs_schoolId_occurredAt_idx" ON "pickup_logs"("schoolId", "occurredAt");

-- AddForeignKey
ALTER TABLE "pickup_authorizations" ADD CONSTRAINT "pickup_authorizations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_authorizations" ADD CONSTRAINT "pickup_authorizations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_authorizations" ADD CONSTRAINT "pickup_authorizations_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_logs" ADD CONSTRAINT "pickup_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_logs" ADD CONSTRAINT "pickup_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_logs" ADD CONSTRAINT "pickup_logs_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "pickup_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
