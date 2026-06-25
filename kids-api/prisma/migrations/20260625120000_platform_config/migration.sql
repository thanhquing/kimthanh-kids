-- CreateTable: cấu hình nền tảng (1 hàng, id="singleton") — thông tin ngân hàng VietQR + grace dunning
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "bankBin" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "pastDueGraceDays" INTEGER NOT NULL DEFAULT 7,
    "suspendedGraceDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);
