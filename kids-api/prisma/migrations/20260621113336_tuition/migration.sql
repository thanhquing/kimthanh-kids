-- CreateEnum
CREATE TYPE "TuitionInvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "TuitionPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'VNPAY');

-- CreateEnum
CREATE TYPE "TuitionPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankBin" TEXT,
ADD COLUMN     "invoiceAddress" TEXT,
ADD COLUMN     "taxCode" TEXT;

-- CreateTable
CREATE TABLE "tuition_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "TuitionInvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_invoice_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "tuition_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "method" "TuitionPaymentMethod" NOT NULL,
    "status" "TuitionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "gatewayRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tuition_invoices_tenantId_idx" ON "tuition_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "tuition_invoices_schoolId_status_idx" ON "tuition_invoices"("schoolId", "status");

-- CreateIndex
CREATE INDEX "tuition_invoices_studentId_idx" ON "tuition_invoices"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_invoices_tenantId_invoiceNumber_key" ON "tuition_invoices"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "tuition_invoice_items_tenantId_idx" ON "tuition_invoice_items"("tenantId");

-- CreateIndex
CREATE INDEX "tuition_invoice_items_invoiceId_idx" ON "tuition_invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "tuition_payments_tenantId_idx" ON "tuition_payments"("tenantId");

-- CreateIndex
CREATE INDEX "tuition_payments_invoiceId_status_idx" ON "tuition_payments"("invoiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_payments_method_gatewayRef_key" ON "tuition_payments"("method", "gatewayRef");

-- AddForeignKey
ALTER TABLE "tuition_invoices" ADD CONSTRAINT "tuition_invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_invoice_items" ADD CONSTRAINT "tuition_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tuition_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_payments" ADD CONSTRAINT "tuition_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tuition_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
