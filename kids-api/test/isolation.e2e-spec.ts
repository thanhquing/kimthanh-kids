import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { LimitMetric } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { BillingJobsService } from "../src/billing/billing-jobs.service";
import { EntitlementService } from "../src/entitlement/entitlement.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { genTaxCode } from "./helpers";

const ROOT = "kimthanhkids.vn";
const PLATFORM_HOST = "admin.kimthanhkids.vn";

describe("Phase 0 — Platform layer (multi-tenant isolation)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jobs: BillingJobsService;
  let entitlements: EntitlementService;

  const suffix = Math.random().toString(36).slice(2, 7);
  const A = {
    slug: `ta-${suffix}`,
    email: `admin@a-${suffix}.vn`,
    password: "Password123",
    token: "",
  };
  const B = {
    slug: `tb-${suffix}`,
    email: `admin@b-${suffix}.vn`,
    password: "Password123",
    token: "",
  };
  const hostA = `${A.slug}.${ROOT}`;
  const hostB = `${B.slug}.${ROOT}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jobs = app.get(BillingJobsService);
    entitlements = app.get(EntitlementService);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it("signup tạo Tenant + School + admin + gói Miễn phí (ACTIVE) cho 2 trường", async () => {
    for (const t of [A, B]) {
      const res = await api()
        .post("/api/public/signup")
        .send({
          schoolName: `Trường ${t.slug}`,
          slug: t.slug,
          taxCode: genTaxCode(),
          adminEmail: t.email,
          adminPassword: t.password,
          adminFullName: "Hiệu trưởng",
        })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.status).toBe("ACTIVE"); // freemium vĩnh viễn
      expect(res.body.data.tenant.host).toBe(`${t.slug}.${ROOT}`);
    }
  });

  it("branding endpoint trả displayName theo host", async () => {
    const res = await api().get(`/api/public/branding?host=${hostA}`).expect(200);
    expect(res.body.data.displayName).toBe(`Trường ${A.slug}`);
  });

  it("đăng nhập theo đúng host của từng tenant", async () => {
    for (const [t, host] of [
      [A, hostA],
      [B, hostB],
    ] as const) {
      const res = await api()
        .post("/api/auth/login")
        .set("Host", host)
        .send({ email: t.email, password: t.password })
        .expect(201);
      expect(res.body.data.accessToken).toBeDefined();
      t.token = res.body.data.accessToken;
    }
  });

  it("mỗi tenant chỉ thấy school CỦA MÌNH (cô lập qua prisma.db)", async () => {
    // A tạo thêm 1 school
    await api()
      .post("/api/tenant/schools")
      .set("Host", hostA)
      .set("Authorization", `Bearer ${A.token}`)
      .send({ name: "Cơ sở 2 của A", code: "CS2" })
      .expect(201);

    const aSchools = await api()
      .get("/api/tenant/schools")
      .set("Host", hostA)
      .set("Authorization", `Bearer ${A.token}`)
      .expect(200);
    const bSchools = await api()
      .get("/api/tenant/schools")
      .set("Host", hostB)
      .set("Authorization", `Bearer ${B.token}`)
      .expect(200);

    // A có 2 (MAIN + CS2), B có 1 (MAIN). Không trộn lẫn.
    expect(aSchools.body.data.length).toBe(2);
    expect(bSchools.body.data.length).toBe(1);
    const aNames = aSchools.body.data.map((s: { name: string }) => s.name);
    expect(aNames).not.toContain("Trường " + B.slug);
  });

  it("CHẶN dùng token tenant A qua host tenant B (TENANT_MISMATCH)", async () => {
    const res = await api()
      .get("/api/tenant/schools")
      .set("Host", hostB)
      .set("Authorization", `Bearer ${A.token}`)
      .expect(403);
    expect(res.body.error.code).toBe("TENANT_MISMATCH");
  });

  it("quota HARD: vượt giới hạn CLASSROOMS của gói free (2) → QUOTA_EXCEEDED", async () => {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: A.slug } });
    const tenantId = tenant!.id;
    // free limit CLASSROOMS = 2 → 2 lần OK, lần 3 ném lỗi.
    for (let i = 0; i < 2; i++) {
      await expect(
        entitlements.consumeQuota(tenantId, LimitMetric.CLASSROOMS),
      ).resolves.toBeUndefined();
    }
    await expect(entitlements.consumeQuota(tenantId, LimitMetric.CLASSROOMS)).rejects.toMatchObject(
      {
        response: { code: "QUOTA_EXCEEDED" },
      },
    );
  });

  it("lifecycle: trial hết hạn → EXPIRED → chặn ghi; thanh toán → ACTIVE lại", async () => {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: B.slug } });
    const tenantId = tenant!.id;

    // Mô phỏng tenant đang dùng thử gói trả phí rồi backdate hạn → chạy job.
    // (Signup mặc định là gói Miễn phí/ACTIVE nên phải set TRIALING tường minh.)
    await prisma.system.subscription.update({
      where: { tenantId },
      data: { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86_400_000) },
    });
    const expired = await jobs.expireTrials();
    expect(expired).toBeGreaterThanOrEqual(1);

    // Ghi bị chặn (SUBSCRIPTION_INACTIVE)
    await api()
      .post("/api/tenant/schools")
      .set("Host", hostB)
      .set("Authorization", `Bearer ${B.token}`)
      .send({ name: "X", code: "X1" })
      .expect(403);

    // Tạo hóa đơn (platform) + thanh toán giả lập → ACTIVE lại
    const platformToken = await loginPlatform();
    const inv = await api()
      .post("/api/platform/invoices")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ tenantId })
      .expect(201);
    await api()
      .post(`/api/platform/invoices/${inv.body.data.id}/mark-paid`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ amount: 0 })
      .expect(201);

    const sub = await prisma.system.subscription.findUnique({ where: { tenantId } });
    expect(sub!.status).toBe("ACTIVE");
  });

  it("webhook idempotent: gửi 2 lần cùng eventId → hóa đơn PAID đúng 1 lần", async () => {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: A.slug } });
    const tenantId = tenant!.id;
    const platformToken = await loginPlatform();

    const inv = await api()
      .post("/api/platform/invoices")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ tenantId })
      .expect(201);

    const pay = await api()
      .post(`/api/billing/invoices/${inv.body.data.id}/pay`)
      .set("Host", hostA)
      .set("Authorization", `Bearer ${A.token}`)
      .send({ provider: "VNPAY" })
      .expect(201);
    const gatewayRef = pay.body.data.gatewayRef;
    const eventId = `evt-${gatewayRef}`;

    const payload = { gatewayRef, eventId, success: true };
    await api().post("/api/platform/webhooks/vnpay").send(payload).expect(201);
    const second = await api().post("/api/platform/webhooks/vnpay").send(payload).expect(201);
    expect(second.body.data.deduped).toBe(true);

    const paidCount = await prisma.system.platformPayment.count({
      where: { gatewayRef, status: "SUCCEEDED" },
    });
    expect(paidCount).toBe(1);
    const invoice = await prisma.system.platformInvoice.findUnique({
      where: { id: inv.body.data.id },
    });
    expect(invoice!.status).toBe("PAID");
  });

  async function loginPlatform(): Promise<string> {
    const res = await api()
      .post("/api/auth/login")
      .set("Host", PLATFORM_HOST)
      .send({ email: "admin@kimthanhkids.vn", password: "Admin@12345" })
      .expect(201);
    return res.body.data.accessToken;
  }
});
