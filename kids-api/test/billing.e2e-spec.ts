import { INestApplication } from "@nestjs/common";
import { LimitMetric } from "@prisma/client";
import { createHmac } from "node:crypto";
import request from "supertest";
import { EntitlementService } from "../src/entitlement/entitlement.service";
import { EnvService } from "../src/config/env.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { PLATFORM_HOST, bootstrap, createTenant, loginPlatform, rnd } from "./helpers";

const SECRET = "test-vnpay-secret-min-16-chars";

function sign(payload: Record<string, unknown>): string {
  const data = Object.keys(payload)
    .filter((k) => k !== "signature" && k !== "vnp_SecureHash")
    .sort()
    .map((k) => `${k}=${String(payload[k])}`)
    .join("&");
  return createHmac("sha512", SECRET).update(data).digest("hex");
}

describe("Phase 0 edge — billing / quota / entitlement / webhook", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let entitlements: EntitlementService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
    entitlements = app.get(EntitlementService);
    // Bật verify chữ ký webhook: ép EnvService trả secret (process.env không kịp do ConfigModule load sớm).
    const env = app.get(EnvService);
    const orig = env.get.bind(env);
    jest
      .spyOn(env, "get")
      .mockImplementation((k: Parameters<typeof orig>[0]) =>
        k === "VNPAY_HASH_SECRET" ? (SECRET as never) : orig(k),
      );
  });
  afterAll(async () => app.close());

  async function planId(code: string): Promise<string> {
    const p = await prisma.system.plan.findUnique({ where: { code } });
    return p!.id;
  }

  // ─────────── ĐỔI GÓI / HỦY ───────────
  it("đổi gói starter → pro: cập nhật plan + ghi SubscriptionChange", async () => {
    const t = await createTenant(app);
    const pro = await planId("pro");
    const res = await api()
      .post("/api/billing/subscription/change")
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .send({ planId: pro, billingCycle: "MONTHLY" })
      .expect(201);
    expect(res.body.data.subscription.plan.code).toBe("pro");

    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const sub = await prisma.system.subscription.findUnique({ where: { tenantId: tenant!.id } });
    const changes = await prisma.system.subscriptionChange.count({
      where: { subscriptionId: sub!.id },
    });
    expect(changes).toBeGreaterThanOrEqual(1);
  });

  it("hủy cuối kỳ: cancelAtPeriodEnd=true, trạng thái chưa đổi", async () => {
    const t = await createTenant(app);
    await api()
      .post("/api/billing/subscription/cancel")
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .send({ atPeriodEnd: true })
      .expect(201);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const sub = await prisma.system.subscription.findUnique({ where: { tenantId: tenant!.id } });
    expect(sub!.cancelAtPeriodEnd).toBe(true);
    expect(sub!.status).toBe("ACTIVE"); // hủy cuối kỳ chưa đổi trạng thái (gói free ACTIVE)
  });

  // ─────────── TOÁN HÓA ĐƠN ───────────
  it("hóa đơn kỳ của gói pro: total = subtotal = giá niêm yết", async () => {
    const t = await createTenant(app);
    const pro = await planId("pro");
    await api()
      .post("/api/billing/subscription/change")
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .send({ planId: pro, billingCycle: "MONTHLY" })
      .expect(201);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    const inv = await api()
      .post("/api/platform/invoices")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ tenantId: tenant!.id })
      .expect(201);
    expect(Number(inv.body.data.total)).toBe(1_200_000);
    expect(Number(inv.body.data.subtotal)).toBe(1_200_000);
  });

  // ─────────── WEBHOOK ───────────
  async function makeInvoiceAndPayment(t: { host: string; adminToken: string; slug: string }) {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    const inv = await api()
      .post("/api/platform/invoices")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ tenantId: tenant!.id })
      .expect(201);
    const pay = await api()
      .post(`/api/billing/invoices/${inv.body.data.id}/pay`)
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .send({ provider: "VNPAY" })
      .expect(201);
    return {
      invoiceId: inv.body.data.id as string,
      gatewayRef: pay.body.data.gatewayRef as string,
    };
  }

  it("webhook sai chữ ký → 400 INVALID_SIGNATURE, hóa đơn không PAID", async () => {
    const t = await createTenant(app);
    const { invoiceId, gatewayRef } = await makeInvoiceAndPayment(t);
    const res = await api()
      .post("/api/platform/webhooks/vnpay")
      .send({ gatewayRef, eventId: `e-${rnd()}`, success: true, signature: "wrong-sig" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
    const inv = await prisma.system.platformInvoice.findUnique({ where: { id: invoiceId } });
    expect(inv!.status).not.toBe("PAID");
  });

  it("webhook chữ ký đúng nhưng thanh toán thất bại → payment FAILED, hóa đơn không PAID", async () => {
    const t = await createTenant(app);
    const { invoiceId, gatewayRef } = await makeInvoiceAndPayment(t);
    const payload: Record<string, unknown> = { gatewayRef, eventId: `e-${rnd()}`, success: false };
    payload.signature = sign(payload);
    await api().post("/api/platform/webhooks/vnpay").send(payload).expect(201);
    const inv = await prisma.system.platformInvoice.findUnique({ where: { id: invoiceId } });
    expect(inv!.status).not.toBe("PAID");
    const pay = await prisma.system.platformPayment.findFirst({ where: { gatewayRef } });
    expect(pay!.status).toBe("FAILED");
  });

  it("webhook chữ ký đúng + thành công → hóa đơn PAID", async () => {
    const t = await createTenant(app);
    const { invoiceId, gatewayRef } = await makeInvoiceAndPayment(t);
    const payload: Record<string, unknown> = { gatewayRef, eventId: `e-${rnd()}`, success: true };
    payload.signature = sign(payload);
    await api().post("/api/platform/webhooks/vnpay").send(payload).expect(201);
    const inv = await prisma.system.platformInvoice.findUnique({ where: { id: invoiceId } });
    expect(inv!.status).toBe("PAID");
  });

  // ─────────── QUOTA ───────────
  it("quota release giảm counter", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const id = tenant!.id;
    await entitlements.consumeQuota(id, LimitMetric.STUDENTS, 5);
    await entitlements.releaseQuota(id, LimitMetric.STUDENTS, 3);
    const usage = await entitlements.getUsage(id);
    expect(usage.STUDENTS).toBe(2);
  });

  it("quota unlimited (enterprise) → không bao giờ chặn", async () => {
    const t = await createTenant(app);
    const ent = await planId("enterprise");
    await api()
      .post("/api/billing/subscription/change")
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .send({ planId: ent, billingCycle: "ANNUAL" })
      .expect(201);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    await expect(
      entitlements.consumeQuota(tenant!.id, LimitMetric.STUDENTS, 100_000),
    ).resolves.toBeUndefined();
  });

  it("quota SOFT cho phép vượt giới hạn (ghi nhận overage)", async () => {
    // Tạo plan SOFT + tenant + subscription trực tiếp.
    const code = `soft-${rnd()}`;
    const plan = await prisma.system.plan.create({
      data: {
        code,
        name: "Soft",
        tier: "CUSTOM",
        isPublic: false,
        limits: { create: [{ metric: "STUDENTS", limitValue: 1, enforcement: "SOFT" }] },
      },
    });
    const tenant = await prisma.system.tenant.create({
      data: { slug: `soft-${rnd()}`, legalName: "Soft Co" },
    });
    await prisma.system.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    // limit=1 nhưng SOFT → tiêu 3 vẫn OK
    await entitlements.consumeQuota(tenant.id, LimitMetric.STUDENTS, 3);
    const usage = await entitlements.getUsage(tenant.id);
    expect(usage.STUDENTS).toBe(3);
  });

  // ─────────── ENTITLEMENT OVERRIDE ───────────
  it("override entitlement (platform) nâng giới hạn cho tenant", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    await api()
      .post(`/api/platform/tenants/${tenant!.id}/entitlements`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ metric: "STUDENTS", limitValue: 9999, reason: "khuyến mãi" })
      .expect(201);
    const ent = await entitlements.resolve(tenant!.id);
    expect(ent.limits.STUDENTS?.limitValue).toBe(9999);
  });
});
