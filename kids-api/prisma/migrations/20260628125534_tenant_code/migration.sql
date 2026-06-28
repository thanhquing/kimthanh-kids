-- Mã trường (human-friendly) cho search/chọn tenant ở login, độc lập subdomain.
ALTER TABLE "tenants" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");
