import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { TenantFixture, bootstrap, createTenant, genTaxCode, rnd } from "./helpers";

/**
 * BL-046 — Consent pháp lý:
 *  - /public/legal trả văn bản hiệu lực (landing đọc để render + tick).
 *  - Đăng ký PHẢI tick đồng ý; hệ thống ghi nhận acceptance (bằng chứng) cho chủ trường.
 *  - User chưa đồng ý bị gate: /auth/me trả pendingConsents; accept xong thì hết.
 */
describe("BL-046 — consent pháp lý", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture) => ({ Host: t.host, Authorization: `Bearer ${t.adminToken}` });

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  it("GET /public/legal trả văn bản hiệu lực (TERMS + PRIVACY, có nội dung)", async () => {
    const res = await api().get("/api/public/legal").expect(200);
    const types = res.body.data.map((d: { type: string }) => d.type).sort();
    expect(types).toEqual(["PRIVACY", "TERMS"]);
    const terms = res.body.data.find((d: { type: string }) => d.type === "TERMS");
    expect(terms.version).toBeTruthy();
    expect(typeof terms.body).toBe("string");
    expect(terms.body.length).toBeGreaterThan(50);
  });

  it("đăng ký thiếu consent → 400; có consent → ghi nhận acceptance cho chủ trường", async () => {
    const slug = `c-${rnd()}`;
    const missing = await api()
      .post("/api/public/signup")
      .send({
        schoolName: "Trường thiếu consent",
        slug,
        taxCode: genTaxCode(),
        adminEmail: `a@${slug}.vn`,
        adminPassword: "Password123",
        adminFullName: "HT",
        // KHÔNG gửi acceptConsent → Zod literal(true) fail
      })
      .expect(400);
    expect(missing.body.error.code).toBe("VALIDATION_FAILED");

    // createTenant helper đã gửi acceptConsent:true → 201 + ghi nhận acceptance.
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirstOrThrow({ where: { slug: t.slug } });
    const rows = await prisma.system.consentAcceptance.findMany({
      where: { tenantId: tenant.id },
    });
    expect(rows.length).toBeGreaterThanOrEqual(2); // TERMS + PRIVACY
    expect(rows.map((r) => r.docType).sort()).toEqual(expect.arrayContaining(["PRIVACY", "TERMS"]));
    expect(rows.every((r) => !!r.userId && !!r.version)).toBe(true); // gắn admin + snapshot version
  });

  it("user chưa đồng ý bị gate: /auth/me có pendingConsents; accept xong thì hết", async () => {
    const t = await createTenant(app);
    // GV mới tạo chưa từng đồng ý.
    const phone = `09${Date.now().toString().slice(-8)}`;
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "Cô Gate", role: "TEACHER", password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: phone, password: "Password123" })
      .expect(201);
    const thead = { Host: t.host, Authorization: `Bearer ${login.body.data.accessToken}` };

    let me = await api().get("/api/auth/me").set(thead).expect(200);
    expect(me.body.data.pendingConsents).toHaveLength(2);

    const ids = me.body.data.pendingConsents.map((d: { id: string }) => d.id);
    await api().post("/api/consent/accept").set(thead).send({ documentIds: ids }).expect(201);

    me = await api().get("/api/auth/me").set(thead).expect(200);
    expect(me.body.data.pendingConsents).toHaveLength(0);
  });

  it("accept với documentIds rỗng → 400", async () => {
    const t = await createTenant(app);
    await api().post("/api/consent/accept").set(auth(t)).send({ documentIds: [] }).expect(400);
  });
});
