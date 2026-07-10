import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TenantFixture, bootstrap, createTenant } from "./helpers";

describe("B3 — vòng đời tài khoản + lịch phân công làm việc", () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });
  const randomPhone = () => "09" + Math.floor(10_000_000 + Math.random() * 89_999_999);

  async function mainSchool(t: TenantFixture): Promise<string> {
    const r = await api().get("/api/tenant/schools").set(auth(t)).expect(200);
    return r.body.data[0].id;
  }
  async function createTeacher(t: TenantFixture, name: string) {
    const phone = randomPhone();
    const r = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: name, role: "TEACHER", password: "Password123" })
      .expect(201);
    return { userId: r.body.data.id as string, phone };
  }

  beforeAll(async () => {
    app = await bootstrap();
  });
  afterAll(async () => app.close());

  it("vô hiệu hoá GV → giải phóng quota + chặn đăng nhập; tạo lại GV khác OK", async () => {
    const t = await createTenant(app); // Free: TEACHERS=1
    const t1 = await createTeacher(t, "Cô Một");
    // đầy 1/1 → GV thứ 2 bị chặn
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone: randomPhone(), fullName: "Cô Hai", role: "TEACHER", password: "Password123" })
      .expect(403);

    // vô hiệu hoá Cô Một → giải phóng 1 slot
    await api()
      .patch(`/api/tenant/members/${t1.userId}/status`)
      .set(auth(t))
      .send({ isActive: false })
      .expect(200);

    // tài khoản bị tắt → không đăng nhập được
    await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: t1.phone, password: "Password123" })
      .expect(401);

    // giờ tạo GV mới được (slot đã trống)
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone: randomPhone(), fullName: "Cô Bốn", role: "TEACHER", password: "Password123" })
      .expect(201);
  });

  it("kích hoạt lại GV khi đã đầy chỗ → 403 QUOTA_EXCEEDED", async () => {
    const t = await createTenant(app);
    const t1 = await createTeacher(t, "Cô A"); // 1/1
    await api()
      .patch(`/api/tenant/members/${t1.userId}/status`)
      .set(auth(t))
      .send({ isActive: false })
      .expect(200); // 0/1
    await createTeacher(t, "Cô B"); // 1/1 trở lại
    const reactivate = await api()
      .patch(`/api/tenant/members/${t1.userId}/status`)
      .set(auth(t))
      .send({ isActive: true })
      .expect(403);
    expect(reactivate.body.error.code).toBe("QUOTA_EXCEEDED");
  });

  it("phân công tuần: admin tạo → GV xem lịch /mine; trùng (thứ+ca) → 409; GV không tạo được (403)", async () => {
    const t = await createTenant(app);
    const schoolId = await mainSchool(t);
    const teacher = await createTeacher(t, "Cô Phân Công");
    const teacherLogin = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ identifier: teacher.phone, password: "Password123" })
      .expect(201);
    const teacherToken = teacherLogin.body.data.accessToken;
    const cls = await api()
      .post("/api/classrooms")
      .set(auth(t))
      .send({ schoolId, name: "Lớp Mầm A" })
      .expect(201);
    const classroomId = cls.body.data.id;

    // admin tạo phân công: Thứ 2, ca sáng, lớp Mầm A
    await api()
      .post("/api/assignments")
      .set(auth(t))
      .send({
        staffId: teacher.userId,
        classroomId,
        weekday: 1,
        shift: "MORNING",
        duty: "GV chính",
      })
      .expect(201);

    // GV xem lịch của mình
    const mine = await api().get("/api/assignments/mine").set(auth(t, teacherToken)).expect(200);
    expect(mine.body.data.length).toBe(1);
    expect(mine.body.data[0].weekday).toBe(1);
    expect(mine.body.data[0].classroom.name).toBe("Lớp Mầm A");

    // trùng (cùng staff + thứ + ca) → 409
    const dup = await api()
      .post("/api/assignments")
      .set(auth(t))
      .send({ staffId: teacher.userId, classroomId, weekday: 1, shift: "MORNING", duty: "GV phụ" })
      .expect(409);
    expect(dup.body.error.code).toBe("ASSIGNMENT_EXISTS");

    // khác ca (chiều), nhiệm vụ không gắn lớp → cần schoolId
    await api()
      .post("/api/assignments")
      .set(auth(t))
      .send({
        staffId: teacher.userId,
        schoolId,
        weekday: 1,
        shift: "AFTERNOON",
        duty: "Trực trưa",
      })
      .expect(201);

    // GV thường không được tạo phân công (403)
    await api()
      .post("/api/assignments")
      .set(auth(t, teacherToken))
      .send({ staffId: teacher.userId, weekday: 2, shift: "MORNING", duty: "x" })
      .expect(403);

    // admin lọc theo nhân sự
    const list = await api()
      .get(`/api/assignments?staffId=${teacher.userId}`)
      .set(auth(t))
      .expect(200);
    expect(list.body.data.length).toBe(2);
  });

  it("không tạo phân công cho phụ huynh (NO_STAFF)", async () => {
    const t = await createTenant(app);
    const phone = randomPhone();
    const parent = await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ phone, fullName: "Phụ huynh", role: "PARENT", password: "Password123" })
      .expect(201);
    const res = await api()
      .post("/api/assignments")
      .set(auth(t))
      .send({
        staffId: parent.body.data.id,
        weekday: 1,
        shift: "MORNING",
        duty: "x",
        schoolId: await mainSchool(t),
      })
      .expect(404);
    expect(res.body.error.code).toBe("NO_STAFF");
  });
});
