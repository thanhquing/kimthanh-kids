-- CreateEnum
CREATE TYPE "TenancyMode" AS ENUM ('POOL', 'SILO');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('PLATFORM', 'TENANT');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_BILLING');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'NURSE', 'FINANCE', 'PARENT');

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('SUBDOMAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFYING', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingCurrency" AS ENUM ('VND', 'USD');

-- CreateEnum
CREATE TYPE "LimitMetric" AS ENUM ('STUDENTS', 'TEACHERS', 'CLASSROOMS', 'SCHOOLS', 'STORAGE_MB', 'PUSH_PER_MONTH', 'ADMIN_USERS');

-- CreateEnum
CREATE TYPE "LimitEnforcement" AS ENUM ('HARD', 'SOFT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('GATEWAY', 'MANUAL', 'DEDICATED_FREE');

-- CreateEnum
CREATE TYPE "SubscriptionChangeType" AS ENUM ('CREATE', 'RENEW', 'UPGRADE', 'DOWNGRADE', 'CANCEL', 'REACTIVATE', 'TRIAL_CONVERT', 'EXPIRE', 'SUSPEND');

-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'OVERDUE', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "PlatformInvoiceLineKind" AS ENUM ('SUBSCRIPTION', 'PRORATION_CREDIT', 'PRORATION_CHARGE', 'OVERAGE', 'DISCOUNT', 'TAX', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PlatformPaymentProvider" AS ENUM ('VNPAY', 'MOMO', 'BANK_TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlatformPaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "CouponDuration" AS ENUM ('ONCE', 'REPEATING', 'FOREVER');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "tenancyMode" "TenancyMode" NOT NULL DEFAULT 'POOL',
    "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "secondaryColor" TEXT,
    "emailFromName" TEXT,
    "emailFromAddr" TEXT,
    "supportEmail" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi-VN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "type" "DomainType" NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "platformRole" "PlatformRole",
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "schoolId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "currency" "BillingCurrency" NOT NULL DEFAULT 'VND',
    "amount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "metric" "LimitMetric" NOT NULL,
    "limitValue" INTEGER,
    "enforcement" "LimitEnforcement" NOT NULL DEFAULT 'HARD',
    "overageUnitPrice" DECIMAL(12,2),

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "currency" "BillingCurrency" NOT NULL DEFAULT 'VND',
    "billingMode" "BillingMode" NOT NULL DEFAULT 'GATEWAY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "pastDueSince" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "entitlementsCache" JSONB,
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_changes" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" "SubscriptionChangeType" NOT NULL,
    "fromPlanId" TEXT,
    "toPlanId" TEXT,
    "fromCycle" "BillingCycle",
    "toCycle" "BillingCycle",
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "prorationAmount" DECIMAL(12,2),
    "actorId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" "BillingCurrency" NOT NULL DEFAULT 'VND',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" "PlatformInvoiceLineKind" NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "PlatformPaymentProvider" NOT NULL,
    "status" "PlatformPaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "BillingCurrency" NOT NULL DEFAULT 'VND',
    "gatewayRef" TEXT,
    "redirectUrl" TEXT,
    "rawPayload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "refundedAmount" DECIMAL(12,2),
    "refundedAt" TIMESTAMP(3),
    "refundRef" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "PlatformPaymentProvider" NOT NULL,
    "eventId" TEXT,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_entitlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "featureKey" TEXT,
    "enabled" BOOLEAN,
    "metric" "LimitMetric",
    "limitValue" INTEGER,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "metric" "LimitMetric" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "DiscountKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "BillingCurrency",
    "duration" "CouponDuration" NOT NULL DEFAULT 'ONCE',
    "durationCount" INTEGER,
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledgers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "BillingCurrency" NOT NULL DEFAULT 'VND',
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT,
    "actorType" "UserType",
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_deletedAt_idx" ON "tenants"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_host_key" ON "tenant_domains"("host");

-- CreateIndex
CREATE INDEX "tenant_domains_tenantId_idx" ON "tenant_domains"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_domains_status_idx" ON "tenant_domains"("status");

-- CreateIndex
CREATE INDEX "schools_tenantId_idx" ON "schools"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "schools_tenantId_code_key" ON "schools"("tenantId", "code");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_type_idx" ON "users"("type");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "memberships_tenantId_idx" ON "memberships"("tenantId");

-- CreateIndex
CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");

-- CreateIndex
CREATE INDEX "memberships_schoolId_idx" ON "memberships"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_role_schoolId_key" ON "memberships"("userId", "role", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "plans_isActive_isPublic_idx" ON "plans"("isActive", "isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_planId_billingCycle_currency_key" ON "plan_prices"("planId", "billingCycle", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_planId_featureKey_key" ON "plan_features"("planId", "featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_planId_metric_key" ON "plan_limits"("planId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantId_key" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "subscriptions_trialEndsAt_idx" ON "subscriptions"("trialEndsAt");

-- CreateIndex
CREATE INDEX "subscriptions_pastDueSince_idx" ON "subscriptions"("pastDueSince");

-- CreateIndex
CREATE INDEX "subscription_changes_subscriptionId_createdAt_idx" ON "subscription_changes"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_invoices_invoiceNumber_key" ON "platform_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "platform_invoices_tenantId_status_idx" ON "platform_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "platform_invoices_status_dueAt_idx" ON "platform_invoices"("status", "dueAt");

-- CreateIndex
CREATE INDEX "platform_invoices_subscriptionId_idx" ON "platform_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "platform_invoice_lines_invoiceId_idx" ON "platform_invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "platform_payments_invoiceId_status_idx" ON "platform_payments"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "platform_payments_tenantId_status_idx" ON "platform_payments"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_payments_provider_gatewayRef_key" ON "platform_payments"("provider", "gatewayRef");

-- CreateIndex
CREATE INDEX "platform_webhook_events_processed_createdAt_idx" ON "platform_webhook_events"("processed", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_webhook_events_provider_eventId_key" ON "platform_webhook_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "tenant_entitlements_tenantId_idx" ON "tenant_entitlements"("tenantId");

-- CreateIndex
CREATE INDEX "usage_counters_tenantId_idx" ON "usage_counters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_tenantId_metric_key" ON "usage_counters"("tenantId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE INDEX "credit_ledgers_tenantId_createdAt_idx" ON "credit_ledgers"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoice_lines" ADD CONSTRAINT "platform_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "platform_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "platform_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_entitlements" ADD CONSTRAINT "tenant_entitlements_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledgers" ADD CONSTRAINT "credit_ledgers_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "platform_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
