import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { bootstrap, genTaxCode, rnd, ROOT } from "./helpers";

/**
 * Discovery công khai (chọn tenant ở login, độc lập subdomain) + đăng nhập qua header x-tenant.
 * Mục tiêu: search theo tên/mã trường/MST, chỉ lộ field an toàn; x-tenant cho login mà không cần Host.
 */
describe("Tenant discovery + x-tenant login (e2e)", () => {
  let app: INestApplication;
  const slug = `disc-${rnd()}`;
  const email = `admin@${slug}.vn`;
  const password = "Password123";
  const schoolName = `Truong Kham Pha ${slug}`;
  const code = `DISC${rnd().toUpperCase()}`;
  let tenantId: string;
  let taxCode: string;

  beforeAll(async () => {
    app = await bootstrap();
    taxCode = genTaxCode();
    const res = await request(app.getHttpServer())
      .post("/api/public/signup")
      .send({
        schoolName,
        slug,
        code,
        taxCode,
        adminEmail: email,
        adminPassword: password,
        adminFullName: "HT",
      })
      .expect(201);
    tenantId = res.body.data.tenant.id;
    expect(res.body.data.tenant.code).toBe(code); // mã nhập tay được giữ (đã uppercase)
  });

  afterAll(async () => {
    await app.close();
  });

  it("search theo mã trường → field an toàn, không lộ nhạy cảm", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/public/tenants")
      .query({ q: code })
      .expect(200);
    const found = res.body.data.find((t: { id: string }) => t.id === tenantId);
    expect(found).toBeTruthy();
    expect(found.code).toBe(code);
    expect(found.displayName).toBe(schoolName);
    expect(found.taxCode).toBe(taxCode);
    expect(found).toHaveProperty("logoUrl");
    expect(found.primaryDomain).toBe(`${slug}.${ROOT}`);
    // KHÔNG lộ field nội bộ
    expect(found).not.toHaveProperty("planTier");
    expect(found).not.toHaveProperty("status");
    expect(found).not.toHaveProperty("settings");
  });

  it("search theo tên trường (không phân biệt hoa thường)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/public/tenants")
      .query({ q: schoolName.slice(0, 12).toUpperCase() })
      .expect(200);
    expect(res.body.data.some((t: { id: string }) => t.id === tenantId)).toBe(true);
  });

  it("q < 2 ký tự → rỗng (chống scrape toàn bộ tenant)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/public/tenants")
      .query({ q: "a" })
      .expect(200);
    expect(res.body.data).toEqual([]);
  });

  it("login qua x-tenant (KHÔNG cần Host) → token gọi được endpoint đã auth", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("x-tenant", tenantId)
      .send({ identifier: email, password })
      .expect(201);
    const token = login.body.data.accessToken;
    expect(token).toBeTruthy();
    // Token mang tenantId → gọi endpoint authed không cần Host/x-tenant.
    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(me.body.data.tenantId).toBe(tenantId);
  });

  it("login không Host lẫn x-tenant → TENANT_REQUIRED", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: email, password })
      .expect(401);
    expect(res.body.error?.code).toBe("TENANT_REQUIRED");
  });

  it("x-tenant trỏ tenant khác → không đăng nhập được (user không thuộc tenant đó)", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("x-tenant", "00000000-0000-0000-0000-000000000000")
      .send({ identifier: email, password })
      .expect(401);
  });
});
