import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TenantFixture, bootstrap, createTenant, rnd } from "./helpers";

describe("Phase 1 — đón/trả (pickup handoff)", () => {
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
      .post("/api/tenant/members")
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
  let s1: string; // có phụ huynh
  let s2: string; // không phụ huynh
  let parent: { userId: string; token: string };

  beforeAll(async () => {
    t = await createTenant(app);
    schoolId = await mainSchool(t);
    parent = await invitedParent(t);
    const st1 = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
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
      .send({ schoolId, fullName: "Bé Hai", dateOfBirth: "2021-02-02", gender: "FEMALE" })
      .expect(201);
    s2 = st2.body.data.id;
  });

  it("GV tạo người đón được ủy quyền → hiện trong danh sách; phụ huynh thấy của con mình", async () => {
    const created = await api()
      .post("/api/pickup/authorizations")
      .set(auth(t))
      .send({
        studentId: s1,
        parentUserId: parent.userId,
        guardianName: "Bà Ngoại",
        guardianPhone: "0900000001",
        relationship: "Bà",
      })
      .expect(201);
    expect(created.body.data.status).toBe("ACTIVE");
    expect(created.body.data.student.id).toBe(s1);

    const list = await api()
      .get(`/api/pickup/authorizations?studentId=${s1}`)
      .set(auth(t))
      .expect(200);
    expect(list.body.data.length).toBe(1);

    // phụ huynh xem người đón của con mình
    const mine = await api()
      .get("/api/pickup/authorizations")
      .set(auth(t, parent.token))
      .expect(200);
    expect(mine.body.data.length).toBe(1);
    expect(mine.body.data[0].student.id).toBe(s1);
  });

  it("ghi nhật ký đón/trả: theo authorizationId (kế thừa người đón) và theo studentId", async () => {
    const authz = await api()
      .post("/api/pickup/authorizations")
      .set(auth(t))
      .send({ studentId: s1, guardianName: "Bố", guardianPhone: "0900000002" })
      .expect(201);

    // CHECK_OUT theo authorizationId → kế thừa guardianName/studentId
    const byAuth = await api()
      .post("/api/pickup/logs")
      .set(auth(t))
      .send({ authorizationId: authz.body.data.id, eventType: "CHECK_OUT" })
      .expect(201);
    expect(byAuth.body.data.guardianName).toBe("Bố");
    expect(byAuth.body.data.student.id).toBe(s1);
    expect(byAuth.body.data.eventType).toBe("CHECK_OUT");

    // CHECK_IN theo studentId trực tiếp (cần guardianName)
    await api()
      .post("/api/pickup/logs")
      .set(auth(t))
      .send({ studentId: s1, eventType: "CHECK_IN", guardianName: "Mẹ" })
      .expect(201);

    const logs = await api().get(`/api/pickup/logs?studentId=${s1}`).set(auth(t)).expect(200);
    expect(logs.body.data.length).toBe(2);
  });

  it("thu hồi ủy quyền → status REVOKED; ghi log bằng authorization đã thu hồi → 404", async () => {
    const authz = await api()
      .post("/api/pickup/authorizations")
      .set(auth(t))
      .send({ studentId: s1, guardianName: "Cô", guardianPhone: "0900000003" })
      .expect(201);
    const revoked = await api()
      .patch(`/api/pickup/authorizations/${authz.body.data.id}/revoke`)
      .set(auth(t))
      .expect(200);
    expect(revoked.body.data.status).toBe("REVOKED");

    const res = await api()
      .post("/api/pickup/logs")
      .set(auth(t))
      .send({ authorizationId: authz.body.data.id, eventType: "CHECK_OUT" })
      .expect(404);
    expect(res.body.error.code).toBe("NO_PICKUP_AUTHORIZATION");
  });

  it("phụ huynh KHÔNG được tạo người đón (403)", async () => {
    await api()
      .post("/api/pickup/authorizations")
      .set(auth(t, parent.token))
      .send({ studentId: s1, guardianName: "X", guardianPhone: "0900000004" })
      .expect(403);
  });

  it("phụ huynh chỉ thấy log của con mình, không thấy bé khác", async () => {
    await api()
      .post("/api/pickup/logs")
      .set(auth(t))
      .send({ studentId: s2, eventType: "CHECK_IN", guardianName: "Người lạ" })
      .expect(201);
    const other = await api()
      .get(`/api/pickup/logs?studentId=${s2}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(other.body.data.length).toBe(0);
  });

  it("query status sai enum → 400 VALIDATION_FAILED (không phải 500)", async () => {
    const res = await api().get("/api/pickup/authorizations?status=NOPE").set(auth(t)).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("tạo người đón cho học sinh không tồn tại → 404 NO_STUDENT", async () => {
    const res = await api()
      .post("/api/pickup/authorizations")
      .set(auth(t))
      .send({
        studentId: "00000000-0000-0000-0000-000000000000",
        guardianName: "X",
        guardianPhone: "0900000005",
      })
      .expect(404);
    expect(res.body.error.code).toBe("NO_STUDENT");
  });
});
