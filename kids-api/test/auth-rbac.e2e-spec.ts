import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { PLATFORM_HOST, bootstrap, createTenant, genTaxCode, loginPlatform, rnd } from "./helpers";

/** Refresh token giờ nằm trong cookie HttpOnly `kk_rt` (không còn ở body). */
function refreshCookie(res: request.Response): string {
  const set = (res.headers["set-cookie"] as unknown as string[]) ?? [];
  const c = set.find((x) => x.startsWith("kk_rt="));
  return c ? decodeURIComponent(c.split(";")[0].split("=")[1]) : "";
}

describe("Phase 0 edge — auth / signup / RBAC / subscription / white-label", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  // ─────────── AUTH ───────────
  describe("auth", () => {
    it("sai mật khẩu → 401 INVALID_CREDENTIALS", async () => {
      const t = await createTenant(app);
      const res = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: "wrong-pass" })
        .expect(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("localize lỗi theo x-language", async () => {
      const t = await createTenant(app);
      const en = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .set("x-language", "en")
        .send({ email: t.email, password: "wrong-pass" })
        .expect(401);
      expect(en.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(en.body.error.message).toBe("Email/phone number or password is incorrect");

      const vi = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .set("x-language", "vi")
        .send({ email: t.email, password: "wrong-pass" })
        .expect(401);
      expect(vi.body.error.message).toBe("Email/số điện thoại hoặc mật khẩu không đúng");
    });

    it("đăng nhập không có tenant context → 401 TENANT_REQUIRED", async () => {
      const res = await api()
        .post("/api/auth/login")
        .set("Host", "api.kimthanhkids.vn")
        .send({ email: "x@y.vn", password: "z" })
        .expect(401);
      expect(res.body.error.code).toBe("TENANT_REQUIRED");
    });

    it("refresh rotation: token cũ bị vô hiệu sau khi dùng", async () => {
      const t = await createTenant(app);
      const login = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(201);
      const oldRefresh = refreshCookie(login);
      expect(oldRefresh).not.toBe("");
      expect(login.body.data.refreshToken).toBeUndefined(); // KHÔNG lộ refresh ra body

      await api().post("/api/auth/refresh").send({ refreshToken: oldRefresh }).expect(201);
      // dùng lại refresh cũ → bị từ chối
      const reuse = await api()
        .post("/api/auth/refresh")
        .send({ refreshToken: oldRefresh })
        .expect(401);
      expect(reuse.body.error.code).toBe("INVALID_REFRESH");
    });

    it("refresh qua cookie HttpOnly (không cần body) → cấp access mới", async () => {
      const t = await createTenant(app);
      const agent = request.agent(app.getHttpServer()); // giữ cookie kk_rt giữa các request
      const login = await agent
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(201);
      expect(login.body.data.accessToken).toBeDefined();
      expect(login.body.data.refreshToken).toBeUndefined();
      // KHÔNG gửi body → server đọc refresh từ cookie
      const refreshed = await agent.post("/api/auth/refresh").expect(201);
      expect(refreshed.body.data.accessToken).toBeDefined();
      expect(refreshed.body.data.refreshToken).toBeUndefined();
    });

    it("logout thu hồi refresh token", async () => {
      const t = await createTenant(app);
      const login = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(201);
      const accessToken = login.body.data.accessToken as string;
      const refreshToken = refreshCookie(login);
      await api()
        .post("/api/auth/logout")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(201);
      await api().post("/api/auth/refresh").send({ refreshToken }).expect(401);
    });

    it("route bảo vệ: thiếu token → 401; token hỏng → 401 INVALID_TOKEN", async () => {
      const t = await createTenant(app);
      await api().get("/api/auth/me").set("Host", t.host).expect(401);
      const bad = await api()
        .get("/api/auth/me")
        .set("Host", t.host)
        .set("Authorization", "Bearer not-a-jwt")
        .expect(401);
      expect(bad.body.error.code).toBe("INVALID_TOKEN");
    });

    it("account lockout: sai mật khẩu đủ ngưỡng → khóa tạm, mật khẩu đúng cũng bị ACCOUNT_LOCKED", async () => {
      const t = await createTenant(app);
      // ngưỡng mặc định 10 (AUTH_LOCKOUT_THRESHOLD) → gửi 10 lần sai (throttle tắt trong e2e)
      for (let i = 0; i < 10; i++) {
        await api()
          .post("/api/auth/login")
          .set("Host", t.host)
          .send({ email: t.email, password: "wrong-pass" })
          .expect(401);
      }
      const locked = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(401);
      expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
    });

    it("reset mật khẩu bump tokenVersion → access token cũ bị vô hiệu ngay", async () => {
      const t = await createTenant(app);
      const email = `gv-${rnd()}@x.vn`;
      const created = await api()
        .post("/api/tenant/members")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ email, fullName: "GV Reset", role: "TEACHER", password: "Password123" })
        .expect(201);
      const memberId = created.body.data.id as string;

      const login = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email, password: "Password123" })
        .expect(201);
      const memHead = { Host: t.host, Authorization: `Bearer ${login.body.data.accessToken}` };

      // token còn dùng được trước khi reset
      await api().get("/api/auth/me").set(memHead).expect(200);

      await api()
        .patch(`/api/tenant/members/${memberId}/password`)
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ password: "NewPass123" })
        .expect(200);

      // token cũ giờ bị vô hiệu do tokenVersion lệch
      const after = await api().get("/api/auth/me").set(memHead).expect(401);
      expect(after.body.error.code).toBe("INVALID_TOKEN");
    });

    it("refresh reuse-detection: dùng lại token đã rotate → revoke cả họ token", async () => {
      const t = await createTenant(app);
      const login = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(201);
      const r1 = refreshCookie(login);

      const rot = await api().post("/api/auth/refresh").send({ refreshToken: r1 }).expect(201);
      const r2 = refreshCookie(rot);

      // dùng lại r1 (đã revoke) → 401 và kích hoạt revoke cả họ
      await api().post("/api/auth/refresh").send({ refreshToken: r1 }).expect(401);
      // r2 (cùng họ) vì thế cũng bị vô hiệu
      await api().post("/api/auth/refresh").send({ refreshToken: r2 }).expect(401);
    });

    it("refresh rotation: double-submit cùng token chỉ một request được cấp token mới", async () => {
      const t = await createTenant(app);
      const login = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(201);
      const r1 = refreshCookie(login);

      const [a, b] = await Promise.all([
        api().post("/api/auth/refresh").send({ refreshToken: r1 }),
        api().post("/api/auth/refresh").send({ refreshToken: r1 }),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 401]);

      const ok = a.status === 201 ? a : b;
      const r2 = refreshCookie(ok);
      await api().post("/api/auth/refresh").send({ refreshToken: r2 }).expect(401);
    });

    it("account lockout: request sai song song vẫn tăng đủ bộ đếm", async () => {
      const t = await createTenant(app);
      const attempts = Array.from({ length: 10 }, () =>
        api()
          .post("/api/auth/login")
          .set("Host", t.host)
          .send({ email: t.email, password: "wrong-pass" }),
      );
      const results = await Promise.all(attempts);
      expect(results.every((r) => r.status === 401)).toBe(true);

      const locked = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: t.email, password: t.password })
        .expect(401);
      expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
    });
  });

  // ─────────── SIGNUP ───────────
  describe("signup", () => {
    it("trùng slug → 400 SLUG_UNAVAILABLE", async () => {
      const t = await createTenant(app);
      const res = await api()
        .post("/api/public/signup")
        .send({
          schoolName: "Trường khác",
          slug: t.slug,
          taxCode: genTaxCode(),
          adminEmail: `other@${rnd()}.vn`,
          adminPassword: "Password123",
          adminFullName: "Người dùng",
        })
        .expect(400);
      expect(res.body.error.code).toBe("SLUG_UNAVAILABLE");
    });

    it("slug reserved (admin) → 400", async () => {
      const res = await api()
        .post("/api/public/signup")
        .send({
          schoolName: "Trường Admin",
          slug: "admin",
          taxCode: genTaxCode(),
          adminEmail: `a@${rnd()}.vn`,
          adminPassword: "Password123",
          adminFullName: "Người dùng",
        })
        .expect(400);
      expect(res.body.error.code).toBe("SLUG_UNAVAILABLE");
    });

    it("slug sai format → 400 VALIDATION_FAILED", async () => {
      const res = await api()
        .post("/api/public/signup")
        .send({
          schoolName: "X",
          slug: "Ab",
          adminEmail: `a@${rnd()}.vn`,
          adminPassword: "Password123",
          adminFullName: "Người dùng",
        })
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("MST sai format/checksum → 400 VALIDATION_FAILED", async () => {
      const res = await api()
        .post("/api/public/signup")
        .send({
          schoolName: "Trường MST sai",
          slug: `t-${rnd()}`,
          taxCode: "1234567890", // 10 số nhưng sai checksum
          adminEmail: `a@${rnd()}.vn`,
          adminPassword: "Password123",
          adminFullName: "Người dùng",
        })
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("MST trùng → 409 TAX_CODE_TAKEN (1 MST = 1 trường)", async () => {
      const taxCode = genTaxCode();
      await api()
        .post("/api/public/signup")
        .send({
          schoolName: "Trường A",
          slug: `t-${rnd()}`,
          taxCode,
          adminEmail: `a@${rnd()}.vn`,
          adminPassword: "Password123",
          adminFullName: "Người dùng",
        })
        .expect(201);
      const res = await api()
        .post("/api/public/signup")
        .send({
          schoolName: "Trường B",
          slug: `t-${rnd()}`,
          taxCode, // cùng MST
          adminEmail: `b@${rnd()}.vn`,
          adminPassword: "Password123",
          adminFullName: "Người dùng",
        })
        .expect(409);
      expect(res.body.error.code).toBe("TAX_CODE_TAKEN");
    });

    it("availability phản ánh slug đã dùng", async () => {
      const t = await createTenant(app);
      const taken = await api().get(`/api/public/availability?slug=${t.slug}`).expect(200);
      expect(taken.body.data.available).toBe(false);
      const free = await api().get(`/api/public/availability?slug=free-${rnd()}`).expect(200);
      expect(free.body.data.available).toBe(true);
    });
  });

  // ─────────── RBAC ───────────
  describe("rbac", () => {
    it("PARENT không được tạo school (403) & không xem settings (403)", async () => {
      const t = await createTenant(app);
      const pemail = `parent@${rnd()}.vn`;
      await api()
        .post("/api/tenant/members")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ email: pemail, fullName: "PH", role: "PARENT", password: "Password123" })
        .expect(201);
      const plogin = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email: pemail, password: "Password123" })
        .expect(201);
      const ptoken = plogin.body.data.accessToken;

      await api()
        .post("/api/tenant/schools")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${ptoken}`)
        .send({ name: "X", code: "X1" })
        .expect(403);
      await api()
        .get("/api/tenant/settings")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${ptoken}`)
        .expect(403);
    });

    async function memberToken(t: { host: string; adminToken: string }, role: string) {
      const email = `${role.toLowerCase()}-${rnd()}@x.vn`;
      await api()
        .post("/api/tenant/members")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ email, fullName: role, role, password: "Password123" })
        .expect(201);
      const login = await api()
        .post("/api/auth/login")
        .set("Host", t.host)
        .send({ email, password: "Password123" })
        .expect(201);
      return login.body.data.accessToken as string;
    }

    it("FINANCE không đọc dữ liệu sức khỏe trẻ (medicine/incidents) → 403 (least-privilege)", async () => {
      const t = await createTenant(app);
      const ftoken = await memberToken(t, "FINANCE");
      const h = { Host: t.host, Authorization: `Bearer ${ftoken}` };
      await api().get("/api/medicine").set(h).expect(403);
      await api().get("/api/incidents").set(h).expect(403);
    });

    it("NURSE không thao tác học phí (tuition) → 403", async () => {
      const t = await createTenant(app);
      const ntoken = await memberToken(t, "NURSE");
      const h = { Host: t.host, Authorization: `Bearer ${ntoken}` };
      await api()
        .post("/api/tuition/invoices")
        .set(h)
        .send({ studentId: "x", period: "2026-07", dueDate: "2026-07-31", items: [] })
        .expect(403);
    });

    it("tenant user gọi route platform → 403", async () => {
      const t = await createTenant(app);
      await api()
        .get("/api/platform/tenants")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .expect(403);
    });

    it("platform admin gọi route platform → OK", async () => {
      const token = await loginPlatform(app);
      await api()
        .get("/api/platform/tenants")
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    it("platform console: tạo tenant, impersonate chủ trường, tạo/list coupon", async () => {
      const token = await loginPlatform(app);
      const slug = `pf-${rnd()}`;
      const host = `${slug}.kimthanhkids.vn`;
      const created = await api()
        .post("/api/platform/tenants")
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${token}`)
        .send({
          schoolName: `Platform ${slug}`,
          slug,
          taxCode: genTaxCode(),
          adminEmail: `admin@${slug}.vn`,
          adminPassword: "Password123",
          adminFullName: "Platform Owner",
        })
        .expect(201);
      const tenantId = created.body.data.tenant.id;

      await api()
        .get(`/api/platform/tenants/${tenantId}`)
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const impersonated = await api()
        .post(`/api/platform/tenants/${tenantId}/impersonate`)
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);
      await api()
        .get("/api/tenant/settings")
        .set("Host", host)
        .set("Authorization", `Bearer ${impersonated.body.data.accessToken}`)
        .expect(200);

      const couponCode = `SALE${rnd()}`.toUpperCase();
      const coupon = await api()
        .post("/api/platform/coupons")
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${token}`)
        .send({ code: couponCode, kind: "PERCENT", amount: 10 })
        .expect(201);
      expect(coupon.body.data.code).toBe(couponCode);

      const coupons = await api()
        .get("/api/platform/coupons?isActive=true")
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(coupons.body.data.some((item: { code: string }) => item.code === couponCode)).toBe(
        true,
      );
    });
  });

  // ─────────── SUBSCRIPTION GUARD ───────────
  describe("subscription guard", () => {
    it("SUSPENDED: chặn ghi (403) nhưng vẫn đọc & xem billing được", async () => {
      const t = await createTenant(app);
      const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
      const ptoken = await loginPlatform(app);

      await api()
        .post(`/api/platform/tenants/${tenant!.id}/suspend`)
        .set("Host", PLATFORM_HOST)
        .set("Authorization", `Bearer ${ptoken}`)
        .expect(201);

      // GET (đọc) vẫn OK
      await api()
        .get("/api/tenant/schools")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .expect(200);
      // POST (ghi) bị chặn
      const blocked = await api()
        .post("/api/tenant/schools")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ name: "X", code: "X9" })
        .expect(403);
      expect(blocked.body.error.code).toBe("SUBSCRIPTION_SUSPENDED");
      // billing self-service (@AllowInactive) vẫn vào được
      await api()
        .get("/api/billing/subscription")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .expect(200);
    });
  });

  // ─────────── WHITE-LABEL ───────────
  describe("white-label", () => {
    it("đổi branding → /public/branding phản ánh; custom domain add+verify→ACTIVE", async () => {
      const t = await createTenant(app);
      await api()
        .patch("/api/tenant/settings")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ displayName: "Mầm Non ABC", primaryColor: "#ff8800" })
        .expect(200);
      const branding = await api().get(`/api/public/branding?host=${t.host}`).expect(200);
      expect(branding.body.data.displayName).toBe("Mầm Non ABC");
      expect(branding.body.data.primaryColor).toBe("#ff8800");

      const customHost = `app.${t.slug}-abc.edu.vn`;
      const add = await api()
        .post("/api/tenant/domains")
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .send({ host: customHost })
        .expect(201);
      expect(add.body.data.verifyToken).toContain("kimthanh-verify=");
      expect(add.body.data.status).toBe("PENDING");

      await api()
        .post(`/api/tenant/domains/${add.body.data.id}/verify`)
        .set("Host", t.host)
        .set("Authorization", `Bearer ${t.adminToken}`)
        .expect(201);

      // resolve theo custom domain đã verify → đăng nhập được
      await api()
        .post("/api/auth/login")
        .set("Host", customHost)
        .send({ email: t.email, password: t.password })
        .expect(201);
    });
  });
});
