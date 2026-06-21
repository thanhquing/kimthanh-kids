-- AlterTable: email trở thành tùy chọn (định danh = email HOẶC phone)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex: phone là duy nhất trong phạm vi tenant (null phân biệt → nhiều null OK)
CREATE UNIQUE INDEX "users_tenantId_phone_key" ON "users"("tenantId", "phone");
