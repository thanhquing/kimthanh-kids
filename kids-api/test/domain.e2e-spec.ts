import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  TenantFixture,
  bootstrap,
  createTenant,
  loginPlatform,
  rnd,
  PLATFORM_HOST,
} from "./helpers";

describe("Phase 1 — domain (classrooms / students / guardians)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  // Lấy schoolId MAIN của tenant
  async function mainSchool(t: TenantFixture): Promise<string> {
    const res = await api()
      .get("/api/tenant/schools")
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .expect(200);
    return res.body.data[0].id;
  }
  async function invite(t: TenantFixture, role: string, schoolId?: string | null) {
    const email = `${role.toLowerCase()}-${rnd()}@x.vn`;
    const res = await api()
      .post("/api/tenant/members")
      .set("Host", t.host)
      .set("Authorization", `Bearer ${t.adminToken}`)
      .send({
        email,
        fullName: `${role} U`,
        role,
        schoolId: schoolId ?? null,
        password: "Password123",
      })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
    return { userId: res.body.data.id as string, token: login.body.data.accessToken as string };
  }
  const auth = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });
  function createStudent(
    t: TenantFixture,
    schoolId: string,
    fullName: string,
    extra = {},
    token = t.adminToken,
  ) {
    return api()
      .post("/api/students")
      .set(auth(t, token))
      .send({ schoolId, fullName, dateOfBirth: "2021-03-15", gender: "MALE", ...extra });
  }

  it("tạo lớp + học sinh, list thấy đúng", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const cls = await api()
      .post("/api/classrooms")
      .set(auth(t))
      .send({ schoolId: school, name: "Lớp Mầm A", ageGroup: "3-4" })
      .expect(201);
    await createStudent(t, school, "Nguyễn Minh", { classroomId: cls.body.data.id }).expect(201);

    const students = await api().get("/api/students").set(auth(t)).expect(200);
    expect(students.body.data.length).toBe(1);
    expect(students.body.data[0].classroom.name).toBe("Lớp Mầm A");
  });

  it("cô lập: tenant A không thấy học sinh của tenant B", async () => {
    const A = await createTenant(app);
    const B = await createTenant(app);
    await createStudent(A, await mainSchool(A), "HS của A").expect(201);
    await createStudent(B, await mainSchool(B), "HS của B").expect(201);

    const aList = await api().get("/api/students").set(auth(A)).expect(200);
    expect(aList.body.data.every((s: { fullName: string }) => s.fullName === "HS của A")).toBe(
      true,
    );
    // dùng token A qua host B → chặn
    await api()
      .get("/api/students")
      .set({ Host: B.host, Authorization: `Bearer ${A.adminToken}` })
      .expect(403);
  });

  it("quota STUDENTS (override = 1): học sinh thứ 2 → 403 QUOTA_EXCEEDED", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    await api()
      .post(`/api/platform/tenants/${tenant!.id}/entitlements`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ metric: "STUDENTS", limitValue: 1 })
      .expect(201);

    const school = await mainSchool(t);
    await createStudent(t, school, "HS 1").expect(201);
    const blocked = await createStudent(t, school, "HS 2").expect(403);
    expect(blocked.body.error.code).toBe("QUOTA_EXCEEDED");
  });

  it("phụ huynh chỉ thấy con mình; không vào được DS học sinh của trường", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const parent = await invite(t, "PARENT");
    await createStudent(t, school, "Con của PH", {
      guardians: [{ parentId: parent.userId, relationship: "Mẹ", isPrimary: true }],
    }).expect(201);
    await createStudent(t, school, "Con nhà khác").expect(201);

    const mine = await api().get("/api/students/mine").set(auth(t, parent.token)).expect(200);
    expect(mine.body.data.length).toBe(1);
    expect(mine.body.data[0].fullName).toBe("Con của PH");
    // PARENT không phải staff → 403 khi xem toàn bộ DS
    await api().get("/api/students").set(auth(t, parent.token)).expect(403);
  });

  it("RBAC: TEACHER không được tạo lớp (403)", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const teacher = await invite(t, "TEACHER", school);
    await api()
      .post("/api/classrooms")
      .set(auth(t, teacher.token))
      .send({ schoolId: school, name: "Lớp X" })
      .expect(403);
  });

  it("school-scope: GIÁO VIÊN chỉ thấy học sinh cơ sở mình", async () => {
    const t = await createTenant(app);
    const school1 = await mainSchool(t);
    const school2res = await api()
      .post("/api/tenant/schools")
      .set(auth(t))
      .send({ name: "Cơ sở 2", code: "CS2" })
      .expect(201);
    const school2 = school2res.body.data.id;

    await createStudent(t, school1, "HS cơ sở 1").expect(201);
    await createStudent(t, school2, "HS cơ sở 2").expect(201);

    const teacher = await invite(t, "TEACHER", school1); // chỉ thuộc cơ sở 1
    const tList = await api().get("/api/students").set(auth(t, teacher.token)).expect(200);
    expect(tList.body.data.length).toBe(1);
    expect(tList.body.data[0].fullName).toBe("HS cơ sở 1");

    // admin (toàn tenant) thấy cả 2
    const aList = await api().get("/api/students").set(auth(t)).expect(200);
    expect(aList.body.data.length).toBe(2);
  });

  // ─────────── B: cập nhật / xoá học sinh ───────────
  it("cập nhật học sinh (PATCH) → phản ánh; xoá (soft-delete) → biến khỏi list", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const st = await createStudent(t, school, "Bé Cũ").expect(201);
    const id = st.body.data.id;

    const upd = await api()
      .patch(`/api/students/${id}`)
      .set(auth(t))
      .send({ fullName: "Bé Mới", status: "INACTIVE" })
      .expect(200);
    expect(upd.body.data.fullName).toBe("Bé Mới");
    expect(upd.body.data.status).toBe("INACTIVE");

    await api().delete(`/api/students/${id}`).set(auth(t)).expect(200);
    const list = await api().get("/api/students").set(auth(t)).expect(200);
    expect(list.body.data.find((s: { id: string }) => s.id === id)).toBeUndefined();
    // GET bản ghi đã xoá → 404
    await api().get(`/api/students/${id}`).set(auth(t)).expect(404);
  });

  // ─────────── B: gán / gỡ phụ huynh rời ───────────
  it("gán + gỡ phụ huynh qua endpoint guardians; /mine của PH cập nhật theo", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const st = await createStudent(t, school, "Bé Có PH").expect(201);
    const id = st.body.data.id;
    const parent = await invite(t, "PARENT");

    // gán
    await api()
      .post(`/api/students/${id}/guardians`)
      .set(auth(t))
      .send({ parentId: parent.userId, relationship: "Ba", isPrimary: true })
      .expect(201);
    let mine = await api().get("/api/students/mine").set(auth(t, parent.token)).expect(200);
    expect(mine.body.data.length).toBe(1);

    const detail = await api().get(`/api/students/${id}`).set(auth(t)).expect(200);
    expect(detail.body.data.parents.length).toBe(1);

    // gỡ
    await api().delete(`/api/students/${id}/guardians/${parent.userId}`).set(auth(t)).expect(200);
    mine = await api().get("/api/students/mine").set(auth(t, parent.token)).expect(200);
    expect(mine.body.data.length).toBe(0);
  });

  // ─────────── B: classroom CRUD + sĩ số ───────────
  it("classroom: get (sĩ số) + update + delete (soft-delete khỏi list)", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const cls = await api()
      .post("/api/classrooms")
      .set(auth(t))
      .send({ schoolId: school, name: "Lớp Lá A", capacity: 20 })
      .expect(201);
    const id = cls.body.data.id;
    await createStudent(t, school, "HS A", { classroomId: id }).expect(201);
    await createStudent(t, school, "HS B", { classroomId: id }).expect(201);

    const got = await api().get(`/api/classrooms/${id}`).set(auth(t)).expect(200);
    expect(got.body.data._count.students).toBe(2);

    const upd = await api()
      .patch(`/api/classrooms/${id}`)
      .set(auth(t))
      .send({ name: "Lớp Lá A1", capacity: 25 })
      .expect(200);
    expect(upd.body.data.name).toBe("Lớp Lá A1");

    await api().delete(`/api/classrooms/${id}`).set(auth(t)).expect(200);
    const list = await api().get("/api/classrooms").set(auth(t)).expect(200);
    expect(list.body.data.find((c: { id: string }) => c.id === id)).toBeUndefined();
  });
});
