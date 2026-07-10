import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  PLATFORM_HOST,
  TenantFixture,
  bootstrap,
  createTenant,
  loginPlatform,
  rnd,
} from "./helpers";

describe("Tạo tài khoản thành viên — định danh email/phone + login cả hai", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });
  const randomPhone = () => "09" + Math.floor(10_000_000 + Math.random() * 89_999_999);

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  it("tạo tài khoản chỉ bằng SỐ ĐIỆN THOẠI → đăng nhập bằng phone OK", async () => {
    const t = await createTenant(app);
    const phone = randomPhone();
    const created = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "Cô Giáo Phone", role: "TEACHER", password: "Password123" })
      .expect(201);
    expect(created.body.data.phone).toBe(phone);
    expect(created.body.data.email).toBeNull();

    // login bằng phone (identifier)
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: phone, password: "Password123" })
      .expect(201);
    expect(login.body.data.accessToken).toBeDefined();
  });

  it("tạo tài khoản bằng EMAIL → vẫn đăng nhập bằng email như cũ", async () => {
    const t = await createTenant(app);
    const email = `gv-${rnd()}@x.vn`;
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ email, fullName: "Cô Giáo Email", role: "NURSE", password: "Password123" })
      .expect(201);
    await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
  });

  it("thiếu cả email lẫn phone → 400", async () => {
    const t = await createTenant(app);
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ fullName: "Không định danh", role: "TEACHER", password: "Password123" })
      .expect(400);
  });

  it("trùng số điện thoại trong cùng trường → 409 MEMBER_EXISTS", async () => {
    const t = await createTenant(app);
    const phone = randomPhone();
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "Người A", role: "TEACHER", password: "Password123" })
      .expect(201);
    const dup = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "Người B", role: "PARENT", password: "Password123" })
      .expect(409);
    expect(dup.body.error.code).toBe("MEMBER_EXISTS");
  });

  it("cùng số điện thoại nhưng KHÁC trường → không bị chặn (cô lập tenant)", async () => {
    const A = await createTenant(app);
    const B = await createTenant(app);
    const phone = randomPhone();
    await api()
      .post("/api/tenant/members")
      .set(auth(A))
      .send({ phone, fullName: "GV A", role: "TEACHER", password: "Password123" })
      .expect(201);
    await api()
      .post("/api/tenant/members")
      .set(auth(B))
      .send({ phone, fullName: "GV B", role: "TEACHER", password: "Password123" })
      .expect(201);
  });

  it("gói Free: tối đa 1 giáo viên (TEACHERS=1) → GV thứ 2 bị 403; phụ huynh KHÔNG giới hạn", async () => {
    const t = await createTenant(app);
    const mkTeacher = (name: string) =>
      api()
        .post("/api/tenant/members")
        .set(auth(t))
        .send({ phone: randomPhone(), fullName: name, role: "TEACHER", password: "Password123" });

    await mkTeacher("Cô A").expect(201);
    const blocked = await mkTeacher("Cô B").expect(403);
    expect(blocked.body.error.code).toBe("QUOTA_EXCEEDED");

    // phụ huynh không tiêu quota giáo viên → vẫn tạo được (Free STUDENTS=10 > 0)
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({
        phone: randomPhone(),
        fullName: "Phụ huynh X",
        role: "PARENT",
        password: "Password123",
      })
      .expect(201);
  });

  it("PARENT giới hạn theo STUDENTS (override=1): phụ huynh thứ 2 → 403 QUOTA_EXCEEDED", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    await api()
      .post(`/api/platform/tenants/${tenant!.id}/entitlements`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ metric: "STUDENTS", limitValue: 1 })
      .expect(201);

    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({
        phone: randomPhone(),
        fullName: "Phụ huynh 1",
        role: "PARENT",
        password: "Password123",
      })
      .expect(201);
    const blocked = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({
        phone: randomPhone(),
        fullName: "Phụ huynh 2",
        role: "PARENT",
        password: "Password123",
      })
      .expect(403);
    expect(blocked.body.error.code).toBe("QUOTA_EXCEEDED");
  });

  it("admin đặt lại mật khẩu thành viên → login mật khẩu mới OK, mật khẩu cũ fail", async () => {
    const t = await createTenant(app);
    const phone = randomPhone();
    const created = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "GV Đổi Mật Khẩu", role: "TEACHER", password: "Password123" })
      .expect(201);
    const userId = created.body.data.id as string;

    const reset = await api()
      .patch(`/api/tenant/members/${userId}/password`)
      .set(auth(t))
      .send({ password: "NewPass456" })
      .expect(200);
    expect(reset.body.data.passwordReset).toBe(true);

    // mật khẩu cũ không còn dùng được
    await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: phone, password: "Password123" })
      .expect(401);
    // mật khẩu mới OK
    await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: phone, password: "NewPass456" })
      .expect(201);
  });

  it("đặt lại mật khẩu < 8 ký tự → 400 VALIDATION_FAILED", async () => {
    const t = await createTenant(app);
    const created = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone: randomPhone(), fullName: "GV", role: "TEACHER", password: "Password123" })
      .expect(201);
    const res = await api()
      .patch(`/api/tenant/members/${created.body.data.id}/password`)
      .set(auth(t))
      .send({ password: "short" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("giáo viên thường không được đặt lại mật khẩu người khác (403)", async () => {
    const t = await createTenant(app);
    const phone = randomPhone();
    const teacher = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "GV thường", role: "TEACHER", password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: phone, password: "Password123" })
      .expect(201);
    await api()
      .patch(`/api/tenant/members/${teacher.body.data.id}/password`)
      .set(auth(t, login.body.data.accessToken))
      .send({ password: "Whatever789" })
      .expect(403);
  });

  it("không phải chủ trường/hiệu trưởng → không tạo được tài khoản (403)", async () => {
    const t = await createTenant(app);
    // tạo 1 giáo viên rồi đăng nhập bằng tài khoản đó
    const phone = randomPhone();
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "GV thường", role: "TEACHER", password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: phone, password: "Password123" })
      .expect(201);
    await api()
      .post("/api/tenant/members")
      .set(auth(t, login.body.data.accessToken))
      .send({ phone: randomPhone(), fullName: "X", role: "PARENT", password: "Password123" })
      .expect(403);
  });
});
