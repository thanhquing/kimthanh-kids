-- BL-046: Consent pháp lý — văn bản có phiên bản + log chấp thuận bất biến.
CREATE TYPE "ConsentDocType" AS ENUM ('TERMS', 'PRIVACY');

CREATE TABLE "consent_documents" (
    "id" TEXT NOT NULL,
    "type" "ConsentDocType" NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consent_documents_type_locale_version_key" ON "consent_documents"("type", "locale", "version");
CREATE INDEX "consent_documents_type_locale_isActive_idx" ON "consent_documents"("type", "locale", "isActive");

CREATE TABLE "consent_acceptances" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "docType" "ConsentDocType" NOT NULL,
    "version" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "email" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_acceptances_userId_idx" ON "consent_acceptances"("userId");
CREATE INDEX "consent_acceptances_tenantId_idx" ON "consent_acceptances"("tenantId");
CREATE INDEX "consent_acceptances_docType_version_idx" ON "consent_acceptances"("docType", "version");

ALTER TABLE "consent_acceptances" ADD CONSTRAINT "consent_acceptances_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "consent_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
