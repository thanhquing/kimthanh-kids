-- AlterTable: MST pháp nhân + mốc xác minh cho tenant
ALTER TABLE "tenants" ADD COLUMN "taxCode" TEXT;
ALTER TABLE "tenants" ADD COLUMN "taxVerifiedAt" TIMESTAMP(3);

-- AlterTable: mã trường Bộ GD&ĐT cho cơ sở
ALTER TABLE "schools" ADD COLUMN "moetCode" TEXT;

-- CreateIndex: mỗi MST chỉ gắn 1 trường (NULL được phép trùng theo Postgres)
CREATE UNIQUE INDEX "tenants_taxCode_key" ON "tenants"("taxCode");
