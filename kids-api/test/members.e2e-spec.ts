import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TenantFixture, bootstrap, createTenant, rnd } from "./helpers";

describe("Tạo tài khoản thành viên — định danh email/phone + login cả hai", () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });
  const randomPhone = () => "09" + Math.floor(10_000_000 + Math.random() * 89_999_999);

  beforeAll(async () => {
    app = await bootstrap();
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

  it("gói Free: tối đa 2 giáo viên (TEACHERS=2) → GV thứ 3 bị 403; phụ huynh KHÔNG giới hạn", async () => {
    const t = await createTenant(app);
    const mkTeacher = (name: string) =>
      api()
        .post("/api/tenant/members")
        .set(auth(t))
        .send({ phone: randomPhone(), fullName: name, role: "TEACHER", password: "Password123" });

    await mkTeacher("Cô A").expect(201);
    await mkTeacher("Cô B").expect(201);
    const blocked = await mkTeacher("Cô C").expect(403);
    expect(blocked.body.error.code).toBe("QUOTA_EXCEEDED");

    // phụ huynh không tiêu quota giáo viên → vẫn tạo được
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
