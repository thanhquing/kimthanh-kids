-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MORNING', 'AFTERNOON', 'FULL_DAY');

-- CreateTable
CREATE TABLE "staff_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "classroomId" TEXT,
    "weekday" INTEGER NOT NULL,
    "shift" "Shift" NOT NULL,
    "duty" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_assignments_tenantId_idx" ON "staff_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "staff_assignments_schoolId_weekday_idx" ON "staff_assignments"("schoolId", "weekday");

-- CreateIndex
CREATE INDEX "staff_assignments_classroomId_idx" ON "staff_assignments"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_assignments_staffId_weekday_shift_key" ON "staff_assignments"("staffId", "weekday", "shift");

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
