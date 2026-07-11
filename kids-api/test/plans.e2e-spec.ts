import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { EntitlementService } from "../src/entitlement/entitlement.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { TenantFixture, bootstrap, createTenant } from "./helpers";

describe("Gói dịch vụ — freemium (Free vĩnh viễn, bậc theo GV/HS)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let entitlements: EntitlementService;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture) => ({ Host: t.host, Authorization: `Bearer ${t.adminToken}` });

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
    entitlements = app.get(EntitlementService);
  });
  afterAll(async () => app.close());

  it("đăng ký mới → gói Miễn phí, ACTIVE (vĩnh viễn), giới hạn 1 GV / 10 HS", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const sub = await prisma.system.subscription.findUnique({
      where: { tenantId: tenant!.id },
      include: { plan: true },
    });
    expect(sub!.plan.code).toBe("free");
    expect(sub!.status).toBe("ACTIVE");
    expect(sub!.trialEndsAt).toBeNull();
    expect(tenant!.planTier).toBe("FREE");

    const ent = await entitlements.resolve(tenant!.id);
    expect(ent.limits.TEACHERS?.limitValue).toBe(1);
    expect(ent.limits.STUDENTS?.limitValue).toBe(10);
    // BL-049: số lớp KHÔNG còn là chiều tính gói → không có limit CLASSROOMS.
    expect(ent.limits.CLASSROOMS).toBeUndefined();
    // tính năng nâng cao tắt ở gói Free
    expect(ent.features.messaging).toBe(false);
    expect(ent.features.analytics).toBe(false);
  });

  it("BL-049: gói Free tạo lớp KHÔNG bị chặn theo gói (số lớp không tính gói)", async () => {
    const t = await createTenant(app);
    const schools = await api().get("/api/tenant/schools").set(auth(t)).expect(200);
    const schoolId = schools.body.data[0].id;

    // Trước đây chặn ở lớp thứ 3; giờ tạo thoải mái.
    for (let i = 1; i <= 3; i++) {
      await api()
        .post("/api/classrooms")
        .set(auth(t))
        .send({ schoolId, name: `Lớp ${i}` })
        .expect(201);
    }
  });

  it("nâng cấp Free → Pro mở giới hạn + bật tính năng", async () => {
    const t = await createTenant(app);
    const pro = await prisma.system.plan.findUnique({ where: { code: "pro" } });
    await api()
      .post("/api/billing/subscription/change")
      .set(auth(t))
      .send({ planId: pro!.id, billingCycle: "MONTHLY" })
      .expect(201);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ent = await entitlements.resolve(tenant!.id);
    expect(ent.limits.STUDENTS?.limitValue).toBe(300);
    expect(ent.limits.TEACHERS?.limitValue).toBe(25);
    expect(ent.features.analytics).toBe(true);
  });
});
