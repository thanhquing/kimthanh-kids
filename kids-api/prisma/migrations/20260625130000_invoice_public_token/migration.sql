-- Link công khai cho hóa đơn nền tảng: publicToken (uuid, unique). Backfill hàng cũ bằng gen_random_uuid().
ALTER TABLE "platform_invoices" ADD COLUMN "publicToken" TEXT;
UPDATE "platform_invoices" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;
ALTER TABLE "platform_invoices" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "platform_invoices_publicToken_key" ON "platform_invoices"("publicToken");
