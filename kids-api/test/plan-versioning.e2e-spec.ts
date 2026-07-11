import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  PLATFORM_HOST,
  TenantFixture,
  bootstrap,
  createTenant,
  genTaxCode,
  loginPlatform,
  rnd,
} from "./helpers";

/**
 * BL-050 — Vòng đời & versioning gói:
 *  - Landing chỉ hiển thị 1 gói ĐẠI DIỆN (featured) mỗi tier.
 *  - Đổi giá = tạo phiên bản gói mới rồi set featured; KHÔNG mutate gói đã bán.
 *  - Renewal (createPeriodInvoice) chuyển thuê bao sang gói đại diện mới + tính giá mới;
 *    hóa đơn/kỳ cũ không đổi.
 *  - Soft-delete bị chặn khi còn thuê bao; deactivate được.
 */
describe("BL-050 — versioning & vòng đời gói", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture) => ({ Host: t.host, Authorization: `Bearer ${t.adminToken}` });
  let phead: { Host: string; Authorization: string };

  const tenantId = async (slug: string) =>
    (await prisma.system.tenant.findFirstOrThrow({ where: { slug } })).id;
  const planByCode = async (code: string) =>
    prisma.system.plan.findFirstOrThrow({ where: { code, deletedAt: null } });

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
    const ptoken = await loginPlatform(app);
    phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };
  });
  afterAll(async () => {
    // Khôi phục gói đại diện PRO về gói seed "pro" để không lệch các suite khác chạy chung DB
    // (test này set featured sang phiên bản mới → phải trả lại trạng thái seed).
    const pro = await prisma.system.plan.findFirst({ where: { code: "pro", deletedAt: null } });
    if (pro) await api().patch(`/api/platform/plans/${pro.id}/feature`).set(phead).expect(200);
    await app.close();
  });

  it("landing /public/plans trả tối đa 1 gói mỗi tier (chỉ gói featured)", async () => {
    const res = await api().get("/api/public/plans").expect(200);
    const tiers = res.body.data.map((p: { tier: string }) => p.tier);
    expect(new Set(tiers).size).toBe(tiers.length); // không trùng tier
    expect(res.body.data.some((p: { code: string }) => p.code === "pro")).toBe(true);
  });

  it("đổi giá = tạo phiên bản mới + set featured; khách cũ giữ giá tới kỳ kế, renewal mới áp giá mới", async () => {
    const pro = await planByCode("pro");

    // 1) Khách nâng lên gói pro (giá seed 1.39tr) — trở thành "khách cũ".
    const t = await createTenant(app);
    await api()
      .post("/api/billing/subscription/change")
      .set(auth(t))
      .send({ planId: pro.id, billingCycle: "MONTHLY" })
      .expect(201);
    const tid = await tenantId(t.slug);

    // 2) Platform tạo phiên bản gói PRO mới (giá cao hơn) rồi đặt làm gói đại diện.
    const v2code = `pro-v2-${Date.now()}`;
    const v2 = await api()
      .post("/api/platform/plans")
      .set(phead)
      .send({
        code: v2code,
        name: "Chuyên nghiệp (2026 Q3)",
        tier: "PRO",
        isPublic: true,
        prices: [{ billingCycle: "MONTHLY", amount: 1_500_000 }],
        features: [{ featureKey: "media_gallery", enabled: true }],
      })
      .expect(201);
    const v2id = v2.body.data.id;
    // Trước khi set featured: landing vẫn hiển thị gói pro cũ.
    let pub = await api().get("/api/public/plans").expect(200);
    expect(pub.body.data.find((p: { tier: string }) => p.tier === "PRO").code).toBe("pro");

    await api().patch(`/api/platform/plans/${v2id}/feature`).set(phead).expect(200);

    // 3) Landing giờ hiển thị gói mới cho tier PRO (vẫn đúng 1 gói/tier).
    pub = await api().get("/api/public/plans").expect(200);
    const proRows = pub.body.data.filter((p: { tier: string }) => p.tier === "PRO");
    expect(proRows).toHaveLength(1);
    expect(proRows[0].code).toBe(v2code);

    // 4) Khách cũ CHƯA bị đổi gói (vẫn pro cũ) cho tới khi phát sinh hóa đơn kỳ mới.
    let sub = await prisma.system.subscription.findFirstOrThrow({ where: { tenantId: tid } });
    expect(sub.planId).toBe(pro.id);

    // 5) Renewal: platform tạo hóa đơn kỳ → thuê bao migrate sang gói đại diện mới + tính giá mới.
    const inv = await api()
      .post("/api/platform/invoices")
      .set(phead)
      .send({ tenantId: tid })
      .expect(201);
    expect(Number(inv.body.data.total)).toBe(1_500_000);

    sub = await prisma.system.subscription.findFirstOrThrow({ where: { tenantId: tid } });
    expect(sub.planId).toBe(v2id);
    const change = await prisma.system.subscriptionChange.findFirst({
      where: { subscriptionId: sub.id, reason: "plan_version_migrate" },
    });
    expect(change).not.toBeNull();
    expect(change!.toPlanId).toBe(v2id);

    // 6) Bất biến: giá gói pro CŨ không đổi (vẫn 1.39tr).
    const oldPrice = await prisma.system.planPrice.findFirstOrThrow({
      where: { planId: pro.id, billingCycle: "MONTHLY", currency: "VND" },
    });
    expect(Number(oldPrice.amount)).toBe(1_390_000);

    // 7) Codex-fix: sau khi v2 là đại diện, KHÔNG đăng ký được bản 'pro' cũ qua planCode (không featured).
    const buyOld = await api()
      .post("/api/public/signup")
      .send({
        schoolName: "Mua bản cũ",
        slug: `old-${rnd()}`,
        taxCode: genTaxCode(),
        adminEmail: `x@old-${rnd()}.vn`,
        adminPassword: "Password123",
        adminFullName: "Chủ trường",
        acceptConsent: true,
        planCode: "pro",
        billingCycle: "MONTHLY",
      })
      .expect(400);
    expect(buyOld.body.error.code).toBe("INVALID_PLAN");
  });

  it("Codex-fix: ngừng bán gói đại diện → gỡ khỏi landing + tự mất featured", async () => {
    // Tạo gói STARTER mới, đặt đại diện (gỡ featured của starter seed), rồi ngừng bán nó.
    const created = await api()
      .post("/api/platform/plans")
      .set(phead)
      .send({
        code: `starter-v2-${Date.now()}`,
        name: "Khởi đầu (v2)",
        tier: "STARTER",
        isPublic: true,
        prices: [{ billingCycle: "MONTHLY", amount: 700_000 }],
      })
      .expect(201);
    const v2id = created.body.data.id;
    await api().patch(`/api/platform/plans/${v2id}/feature`).set(phead).expect(200);

    await api().patch(`/api/platform/plans/${v2id}/deactivate`).set(phead).expect(200);
    const after = await prisma.system.plan.findFirstOrThrow({ where: { id: v2id } });
    expect(after.isActive).toBe(false);
    expect(after.isFeatured).toBe(false); // deactivate tự gỡ featured (invariant)

    const pub = await api().get("/api/public/plans").expect(200);
    expect(pub.body.data.some((p: { id: string }) => p.id === v2id)).toBe(false);

    // Khôi phục: starter seed làm đại diện lại cho tier STARTER (không lệch suite khác).
    const starter = await planByCode("starter");
    await api().patch(`/api/platform/plans/${starter.id}/feature`).set(phead).expect(200);
  });

  it("không xoá được gói còn thuê bao; deactivate thì được", async () => {
    await createTenant(app); // đảm bảo gói free có ít nhất 1 thuê bao (tenant này ở lại free)
    const free = await planByCode("free");
    const del = await api().delete(`/api/platform/plans/${free.id}`).set(phead).expect(400);
    expect(del.body.error.code).toBe("PLAN_HAS_SUBSCRIPTIONS");

    // Gói mới chưa có thuê bao → xoá mềm được.
    const tmp = await api()
      .post("/api/platform/plans")
      .set(phead)
      .send({ code: `tmp-del-${Date.now()}`, name: "Tạm", tier: "STARTER" })
      .expect(201);
    await api().delete(`/api/platform/plans/${tmp.body.data.id}`).set(phead).expect(200);
    const gone = await prisma.system.plan.findFirstOrThrow({ where: { id: tmp.body.data.id } });
    expect(gone.deletedAt).not.toBeNull();
  });
});
