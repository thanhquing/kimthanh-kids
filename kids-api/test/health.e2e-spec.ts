import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TenantFixture, bootstrap, createTenant, rnd } from "./helpers";

describe("Phase 1 — D. Sức khỏe (health/medicine/incidents/leave)", () => {
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

  let t: TenantFixture;
  let schoolId: string;
  let classroomId: string;
  let s1: string; // có phụ huynh
  let s2: string; // không liên kết phụ huynh
  let parent: { userId: string; token: string };

  beforeAll(async () => {
    t = await createTenant(app);
    schoolId = await mainSchool(t);
    parent = await invitedParent(t);
    const cls = await api()
      .post("/api/classrooms")
      .set(auth(t))
      .send({ schoolId, name: "Lớp Chồi A" })
      .expect(201);
    classroomId = cls.body.data.id;
    const st1 = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
        classroomId,
        fullName: "Bé Sức Khỏe",
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
        fullName: "Bé Khác",
        dateOfBirth: "2021-02-02",
        gender: "FEMALE",
      })
      .expect(201);
    s2 = st2.body.data.id;
  });

  // ── D1: Health records + growth ──
  it("D1: staff ghi chỉ số → growth trả chuỗi điểm; PH xem con mình, không thấy bé khác", async () => {
    await api()
      .post("/api/health")
      .set(auth(t))
      .send({ studentId: s1, date: "2026-01-10", heightCm: 90, weightKg: 13 })
      .expect(201);
    await api()
      .post("/api/health")
      .set(auth(t))
      .send({ studentId: s1, date: "2026-06-10", heightCm: 95, weightKg: 14.5, temperatureC: 37 })
      .expect(201);

    // cần ít nhất 1 chỉ số
    await api()
      .post("/api/health")
      .set(auth(t))
      .send({ studentId: s1, date: "2026-06-11" })
      .expect(400);

    const growth = await api()
      .get(`/api/health/student/${s1}/growth`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(growth.body.data.height.length).toBe(2);
    expect(growth.body.data.weight.length).toBe(2);
    expect(growth.body.data.height[0].value).toBe(90);

    // PH không được xem growth bé không phải con (NotFound)
    await api().get(`/api/health/student/${s2}/growth`).set(auth(t, parent.token)).expect(404);

    const records = await api()
      .get(`/api/health/student/${s1}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(records.body.data.length).toBe(2);
  });

  // ── D2: Medicine requests ──
  it("D2: PH tạo yêu cầu → staff duyệt → cho uống; timeline ghi nhận", async () => {
    const created = await api()
      .post("/api/medicine")
      .set(auth(t, parent.token))
      .send({
        studentId: s1,
        medicineName: "Hapacol",
        dosage: "1 gói",
        schedule: "8h, 14h",
        startDate: "2026-06-21",
        endDate: "2026-06-23",
        reason: "Hạ sốt",
      })
      .expect(201);
    const reqId = created.body.data.id;
    expect(created.body.data.status).toBe("PENDING");

    // PH xem đơn của mình
    const mine = await api().get("/api/medicine/mine").set(auth(t, parent.token)).expect(200);
    expect(mine.body.data.length).toBe(1);

    // staff thấy trong danh sách PENDING
    const pending = await api().get("/api/medicine?status=PENDING").set(auth(t)).expect(200);
    expect(pending.body.data.some((r: { id: string }) => r.id === reqId)).toBe(true);

    // chưa duyệt mà cho uống → 400
    await api()
      .post(`/api/medicine/${reqId}/handle`)
      .set(auth(t))
      .send({ status: "ADMINISTERED" })
      .expect(400);

    await api()
      .post(`/api/medicine/${reqId}/handle`)
      .set(auth(t))
      .send({ status: "APPROVED", note: "OK" })
      .expect(201);
    await api()
      .post(`/api/medicine/${reqId}/handle`)
      .set(auth(t))
      .send({ status: "ADMINISTERED", note: "Đã cho uống 8h" })
      .expect(201);

    const detail = await api().get(`/api/medicine/${reqId}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).toBe("ADMINISTERED");
    expect(detail.body.data.history.length).toBe(3); // PENDING + APPROVED + ADMINISTERED
  });

  it("D2: PH không tạo được yêu cầu cho bé không phải con (404)", async () => {
    await api()
      .post("/api/medicine")
      .set(auth(t, parent.token))
      .send({
        studentId: s2,
        medicineName: "X",
        dosage: "1",
        schedule: "8h",
        startDate: "2026-06-21",
        endDate: "2026-06-22",
      })
      .expect(404);
  });

  // ── D3: Incidents + Allergies ──
  it("D3: staff ghi sự cố → PH xem con mình; dị ứng unique", async () => {
    await api()
      .post("/api/incidents")
      .set(auth(t))
      .send({
        studentId: s1,
        date: "2026-06-21",
        type: "Té ngã",
        severity: "MEDIUM",
        description: "Ngã ở sân chơi",
        actionTaken: "Sơ cứu, theo dõi",
      })
      .expect(201);

    const feed = await api()
      .get(`/api/incidents/student/${s1}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(feed.body.data.length).toBe(1);
    expect(feed.body.data[0].severity).toBe("MEDIUM");

    // PH không phải reporter → 403 khi tạo
    await api()
      .post("/api/incidents")
      .set(auth(t, parent.token))
      .send({ studentId: s1, date: "2026-06-21", type: "x", description: "y" })
      .expect(403);

    // Allergy
    await api()
      .post("/api/allergies")
      .set(auth(t))
      .send({ studentId: s1, allergen: "Đậu phộng", note: "Nặng" })
      .expect(201);
    // trùng → 409
    await api()
      .post("/api/allergies")
      .set(auth(t))
      .send({ studentId: s1, allergen: "Đậu phộng" })
      .expect(409);

    const allergies = await api()
      .get(`/api/allergies/student/${s1}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(allergies.body.data.length).toBe(1);
  });

  // ── D4: Leave requests ──
  it("D4: PH tạo đơn → GV duyệt; không duyệt lại được", async () => {
    const created = await api()
      .post("/api/leave")
      .set(auth(t, parent.token))
      .send({
        studentId: s1,
        leaveType: "SICK",
        startDate: "2026-06-22",
        endDate: "2026-06-24",
        reason: "Bé bị sốt",
      })
      .expect(201);
    const leaveId = created.body.data.id;

    const mine = await api().get("/api/leave/mine").set(auth(t, parent.token)).expect(200);
    expect(mine.body.data.length).toBe(1);

    const pending = await api().get("/api/leave?status=PENDING").set(auth(t)).expect(200);
    expect(pending.body.data.some((r: { id: string }) => r.id === leaveId)).toBe(true);

    await api()
      .post(`/api/leave/${leaveId}/decide`)
      .set(auth(t))
      .send({ status: "APPROVED", note: "Đồng ý" })
      .expect(201);
    // duyệt lại → 400
    await api()
      .post(`/api/leave/${leaveId}/decide`)
      .set(auth(t))
      .send({ status: "REJECTED" })
      .expect(400);

    const detail = await api().get(`/api/leave/${leaveId}`).set(auth(t, parent.token)).expect(200);
    expect(detail.body.data.status).toBe("APPROVED");
  });

  it("D4: ngày kết thúc trước ngày bắt đầu → 400", async () => {
    await api()
      .post("/api/leave")
      .set(auth(t, parent.token))
      .send({ studentId: s1, leaveType: "OTHER", startDate: "2026-06-24", endDate: "2026-06-22" })
      .expect(400);
  });

  // ── D: nhánh từ chối + ranh giới quyền (rủi ro khi ghép UI) ──
  it("D2: nhánh REJECT — từ chối rồi không xử lý lại được; PARENT không được /handle (403)", async () => {
    const created = await api()
      .post("/api/medicine")
      .set(auth(t, parent.token))
      .send({
        studentId: s1,
        medicineName: "Siro ho",
        dosage: "5ml",
        schedule: "20h",
        startDate: "2026-06-25",
        endDate: "2026-06-26",
      })
      .expect(201);
    const id = created.body.data.id;

    // PARENT không được xử lý
    await api()
      .post(`/api/medicine/${id}/handle`)
      .set(auth(t, parent.token))
      .send({ status: "APPROVED" })
      .expect(403);

    const rejected = await api()
      .post(`/api/medicine/${id}/handle`)
      .set(auth(t))
      .send({ status: "REJECTED", note: "Thiếu đơn thuốc" })
      .expect(201);
    expect(rejected.body.data.status).toBe("REJECTED");

    // đã reject → mọi xử lý tiếp đều 400
    await api()
      .post(`/api/medicine/${id}/handle`)
      .set(auth(t))
      .send({ status: "APPROVED" })
      .expect(400);
  });

  it("D4: nhánh REJECT; PARENT không được /decide (403)", async () => {
    const created = await api()
      .post("/api/leave")
      .set(auth(t, parent.token))
      .send({ studentId: s1, leaveType: "FAMILY", startDate: "2026-07-01", endDate: "2026-07-02" })
      .expect(201);
    const id = created.body.data.id;

    await api()
      .post(`/api/leave/${id}/decide`)
      .set(auth(t, parent.token))
      .send({ status: "APPROVED" })
      .expect(403);

    const res = await api()
      .post(`/api/leave/${id}/decide`)
      .set(auth(t))
      .send({ status: "REJECTED", note: "Trùng lịch sự kiện" })
      .expect(201);
    expect(res.body.data.status).toBe("REJECTED");
  });

  it("D1/D3: PARENT không được tạo health record / allergy / incident (403); staff xoá allergy + list incidents", async () => {
    await api()
      .post("/api/health")
      .set(auth(t, parent.token))
      .send({ studentId: s1, date: "2026-06-25", heightCm: 96 })
      .expect(403);
    await api()
      .post("/api/allergies")
      .set(auth(t, parent.token))
      .send({ studentId: s1, allergen: "Hải sản" })
      .expect(403);
    await api()
      .post("/api/incidents")
      .set(auth(t, parent.token))
      .send({ studentId: s1, date: "2026-06-25", type: "x", description: "y" })
      .expect(403);

    // staff: danh sách sự cố toàn trường
    const incidents = await api().get("/api/incidents").set(auth(t)).expect(200);
    expect(incidents.body.data.length).toBeGreaterThanOrEqual(1);

    // staff: tạo rồi xoá allergy
    const al = await api()
      .post("/api/allergies")
      .set(auth(t))
      .send({ studentId: s2, allergen: "Phấn hoa" })
      .expect(201);
    await api().delete(`/api/allergies/${al.body.data.id}`).set(auth(t)).expect(200);
    const after = await api().get(`/api/allergies/student/${s2}`).set(auth(t)).expect(200);
    expect(after.body.data.find((a: { id: string }) => a.id === al.body.data.id)).toBeUndefined();
  });
});
