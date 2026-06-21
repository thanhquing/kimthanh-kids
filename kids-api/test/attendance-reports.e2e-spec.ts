import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TenantFixture, bootstrap, createTenant, rnd } from "./helpers";

describe("Phase 1 — attendance / daily reports", () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await bootstrap();
  });
  afterAll(async () => app.close());

  const auth = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });
  async function mainSchool(t: TenantFixture): Promise<string> {
    const r = await api().get("/api/tenant/schools").set(auth(t)).expect(200);
    return r.body.data[0].id;
  }
  async function invitedParent(t: TenantFixture) {
    const email = `ph-${rnd()}@x.vn`;
    const r = await api()
      .post("/api/tenant/members/invite")
      .set(auth(t))
      .send({ email, fullName: "Phụ huynh", role: "PARENT", password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
    return { userId: r.body.data.id as string, token: login.body.data.accessToken as string };
  }

  // Bộ dữ liệu dùng chung
  let t: TenantFixture;
  let schoolId: string;
  let classroomId: string;
  let s1: string; // có phụ huynh
  let s2: string;
  let parent: { userId: string; token: string };
  const today = "2026-06-21";

  beforeAll(async () => {
    t = await createTenant(app);
    schoolId = await mainSchool(t);
    parent = await invitedParent(t);
    const cls = await api()
      .post("/api/classrooms")
      .set(auth(t))
      .send({ schoolId, name: "Lớp Mầm A" })
      .expect(201);
    classroomId = cls.body.data.id;
    const st1 = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
        classroomId,
        fullName: "Bé Một",
        dateOfBirth: "2021-01-01",
        gender: "MALE",
        guardians: [{ parentId: parent.userId, relationship: "Mẹ", isPrimary: true }],
      })
      .expect(201);
    s1 = st1.body.data.id;
    const st2 = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
        classroomId,
        fullName: "Bé Hai",
        dateOfBirth: "2021-02-02",
        gender: "FEMALE",
      })
      .expect(201);
    s2 = st2.body.data.id;
  });

  it("điểm danh hàng loạt + upsert (đánh lại không nhân đôi)", async () => {
    await api()
      .post("/api/attendance/mark")
      .set(auth(t))
      .send({
        classroomId,
        date: today,
        entries: [
          { studentId: s1, status: "PRESENT" },
          { studentId: s2, status: "LATE" },
        ],
      })
      .expect(201);

    let list = await api()
      .get(`/api/attendance?classroomId=${classroomId}&date=${today}`)
      .set(auth(t))
      .expect(200);
    expect(list.body.data.length).toBe(2);

    // đánh lại s1 → ABSENT (update, không tạo mới)
    await api()
      .post("/api/attendance/mark")
      .set(auth(t))
      .send({ classroomId, date: today, entries: [{ studentId: s1, status: "ABSENT" }] })
      .expect(201);
    list = await api()
      .get(`/api/attendance?classroomId=${classroomId}&date=${today}`)
      .set(auth(t))
      .expect(200);
    expect(list.body.data.length).toBe(2);
    const r1 = list.body.data.find((a: { studentId: string }) => a.studentId === s1);
    expect(r1.status).toBe("ABSENT");
  });

  it("phụ huynh xem lịch sử điểm danh con mình; không thấy bé khác", async () => {
    const mine = await api()
      .get(`/api/attendance/student/${s1}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(mine.body.data.length).toBeGreaterThanOrEqual(1);
    // bé không phải con → rỗng (không rò rỉ)
    const other = await api()
      .get(`/api/attendance/student/${s2}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(other.body.data.length).toBe(0);
  });

  it("báo cáo hằng ngày: GV soạn → phụ huynh xem feed con mình", async () => {
    await api()
      .post("/api/daily-reports")
      .set(auth(t))
      .send({ studentId: s1, date: today, mood: "HAPPY", meals: "Ăn hết suất", nap: "Ngủ ngon" })
      .expect(201);

    const feed = await api()
      .get(`/api/daily-reports/student/${s1}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(feed.body.data.length).toBe(1);
    expect(feed.body.data[0].mood).toBe("HAPPY");

    const byClass = await api()
      .get(`/api/daily-reports?classroomId=${classroomId}&date=${today}`)
      .set(auth(t))
      .expect(200);
    expect(byClass.body.data.length).toBe(1);
  });

  it("PARENT không được điểm danh (403)", async () => {
    await api()
      .post("/api/attendance/mark")
      .set(auth(t, parent.token))
      .send({ classroomId, date: today, entries: [{ studentId: s1, status: "PRESENT" }] })
      .expect(403);
  });
});
