import { BillingCycle, LimitMetric, PlanTier, PrismaClient, UserType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const FEATURES = ["messaging", "media_gallery", "lesson_plan", "analytics", "api_access"];

async function upsertPlan(args: {
  code: string;
  name: string;
  tier: PlanTier;
  isPublic: boolean;
  trialDays: number;
  sortOrder: number;
  prices: { billingCycle: BillingCycle; amount: number }[];
  features: Record<string, boolean>;
  limits: Partial<Record<LimitMetric, number | null>>;
}) {
  const plan = await prisma.plan.upsert({
    where: { code: args.code },
    update: {
      name: args.name,
      tier: args.tier,
      isPublic: args.isPublic,
      trialDays: args.trialDays,
      sortOrder: args.sortOrder,
    },
    create: {
      code: args.code,
      name: args.name,
      tier: args.tier,
      isPublic: args.isPublic,
      trialDays: args.trialDays,
      sortOrder: args.sortOrder,
    },
  });

  for (const p of args.prices) {
    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle_currency: {
          planId: plan.id,
          billingCycle: p.billingCycle,
          currency: "VND",
        },
      },
      update: { amount: p.amount },
      create: { planId: plan.id, billingCycle: p.billingCycle, currency: "VND", amount: p.amount },
    });
  }
  for (const key of FEATURES) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: plan.id, featureKey: key } },
      update: { enabled: args.features[key] ?? false },
      create: { planId: plan.id, featureKey: key, enabled: args.features[key] ?? false },
    });
  }
  for (const [metric, limitValue] of Object.entries(args.limits)) {
    await prisma.planLimit.upsert({
      where: { planId_metric: { planId: plan.id, metric: metric as LimitMetric } },
      update: { limitValue },
      create: { planId: plan.id, metric: metric as LimitMetric, limitValue, enforcement: "HARD" },
    });
  }
  return plan;
}

async function main() {
  // ─── 3 gói công khai (theo bang-gia.tsx) + 1 gói dedicated ẩn ───
  await upsertPlan({
    code: "starter",
    name: "Khởi đầu",
    tier: PlanTier.STARTER,
    isPublic: true,
    trialDays: 30,
    sortOrder: 1,
    prices: [{ billingCycle: BillingCycle.MONTHLY, amount: 0 }],
    features: {
      messaging: true,
      media_gallery: false,
      lesson_plan: false,
      analytics: false,
      api_access: false,
    },
    limits: { STUDENTS: 50, TEACHERS: 10, CLASSROOMS: 5, SCHOOLS: 1, STORAGE_MB: 1024 },
  });

  await upsertPlan({
    code: "pro",
    name: "Chuyên nghiệp",
    tier: PlanTier.PRO,
    isPublic: true,
    trialDays: 0,
    sortOrder: 2,
    prices: [
      { billingCycle: BillingCycle.MONTHLY, amount: 1_200_000 },
      { billingCycle: BillingCycle.QUARTERLY, amount: 3_240_000 },
      { billingCycle: BillingCycle.ANNUAL, amount: 12_240_000 },
    ],
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: true,
      analytics: true,
      api_access: false,
    },
    limits: { STUDENTS: 500, TEACHERS: 80, CLASSROOMS: 40, SCHOOLS: 1, STORAGE_MB: 20480 },
  });

  await upsertPlan({
    code: "enterprise",
    name: "Hệ thống",
    tier: PlanTier.ENTERPRISE,
    isPublic: true,
    trialDays: 0,
    sortOrder: 3,
    prices: [{ billingCycle: BillingCycle.ANNUAL, amount: 0 }], // liên hệ — giá thỏa thuận
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: true,
      analytics: true,
      api_access: true,
    },
    limits: { STUDENTS: null, TEACHERS: null, CLASSROOMS: null, SCHOOLS: null, STORAGE_MB: null },
  });

  await upsertPlan({
    code: "dedicated",
    name: "Triển khai riêng",
    tier: PlanTier.CUSTOM,
    isPublic: false,
    trialDays: 0,
    sortOrder: 4,
    prices: [{ billingCycle: BillingCycle.ANNUAL, amount: 0 }],
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: true,
      analytics: true,
      api_access: true,
    },
    limits: { STUDENTS: null, TEACHERS: null, CLASSROOMS: null, SCHOOLS: null, STORAGE_MB: null },
  });

  // ─── Platform super-admin (staff của bạn) ───
  const passwordHash = await bcrypt.hash("Admin@12345", 10);
  const existing = await prisma.user.findFirst({
    where: { email: "admin@kimthanhkids.vn", tenantId: null },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        type: UserType.PLATFORM,
        email: "admin@kimthanhkids.vn",
        fullName: "Platform Super Admin",
        passwordHash,
        platformRole: "PLATFORM_SUPER_ADMIN",
        tenantId: null,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed xong: 4 plan (starter/pro/enterprise/dedicated) + platform super-admin");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
