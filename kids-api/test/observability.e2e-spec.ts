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

describe("G — Notification / Dashboard / Audit / Usage", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });

  async function mainSchool(t: TenantFixture): Promise<string> {
    const r = await api().get("/api/tenant/schools").set(auth(t)).expect(200);
    return r.body.data[0].id;
  }
  async function parent(t: TenantFixture) {
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
  async function student(t: TenantFixture, schoolId: string, parentId: string) {
    const r = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
        fullName: "Bé G",
        dateOfBirth: "2021-01-01",
        gender: "MALE",
        guardians: [{ parentId, relationship: "Mẹ", isPrimary: true }],
      })
      .expect(201);
    return r.body.data.id as string;
  }
  const createIncident = (t: TenantFixture, sid: string) =>
    api()
      .post("/api/incidents")
      .set(auth(t))
      .send({ studentId: sid, date: "2026-06-21", type: "Té ngã", description: "Trầy nhẹ" });

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  // ── G1 Notification ──
  it("sự cố → PH nhận thông báo; đọc → unread giảm; tắt loại → không nhận nữa", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const p = await parent(t);
    const sid = await student(t, school, p.userId);

    await createIncident(t, sid).expect(201);

    const feed = await api().get("/api/notifications").set(auth(t, p.token)).expect(200);
    expect(feed.body.data.length).toBe(1);
    expect(feed.body.data[0].type).toBe("INCIDENT");
    expect(feed.body.data[0].linkType).toBe("Incident");
    const notifId = feed.body.data[0].id;

    const unread = await api()
      .get("/api/notifications/unread-count")
      .set(auth(t, p.token))
      .expect(200);
    expect(unread.body.data.count).toBe(1);

    await api().post(`/api/notifications/${notifId}/read`).set(auth(t, p.token)).expect(201);
    const unread2 = await api()
      .get("/api/notifications/unread-count")
      .set(auth(t, p.token))
      .expect(200);
    expect(unread2.body.data.count).toBe(0);

    // Tắt loại INCIDENT → sự cố mới không tạo thông báo nữa.
    await api()
      .patch("/api/notifications/preferences")
      .set(auth(t, p.token))
      .send({ type: "INCIDENT", enabled: false })
      .expect(200);
    await createIncident(t, sid).expect(201);
    const feed2 = await api().get("/api/notifications").set(auth(t, p.token)).expect(200);
    expect(feed2.body.data.length).toBe(1); // vẫn 1 (cái mới bị chặn theo preference)

    // PH chỉ thấy thông báo của chính mình — PH khác không thấy gì.
    const p2 = await parent(t);
    const feedOther = await api().get("/api/notifications").set(auth(t, p2.token)).expect(200);
    expect(feedOther.body.data.length).toBe(0);
  });

  // ── G2 Dashboard ──
  it("dashboard tổng hợp KPI theo cơ sở", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const p = await parent(t);
    const sid = await student(t, school, p.userId);
    await api()
      .post("/api/tuition/invoices")
      .set(auth(t))
      .send({
        studentId: sid,
        period: "2026-07",
        dueDate: "2026-07-31",
        items: [{ label: "Học phí", unitPrice: 1_000_000 }],
      })
      .expect(201);

    const r = await api().get("/api/dashboard/summary").set(auth(t)).expect(200);
    expect(r.body.data.students).toBe(1);
    expect(r.body.data.outstandingInvoices).toBe(1);
    expect(r.body.data.outstandingAmount).toBe(1_000_000);
    expect(r.body.data.attendanceToday).toHaveProperty("PRESENT");

    // PH không được xem dashboard quản trị.
    await api().get("/api/dashboard/summary").set(auth(t, p.token)).expect(403);
  });

  // ── G4 Audit ──
  it("ghi audit hành động nhạy cảm: tạo thành viên + hủy hóa đơn", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const p = await parent(t); // tạo member → audit member.create
    const sid = await student(t, school, p.userId);
    const inv = await api()
      .post("/api/tuition/invoices")
      .set(auth(t))
      .send({
        studentId: sid,
        period: "2026-08",
        dueDate: "2026-08-31",
        items: [{ label: "Học phí", unitPrice: 500_000 }],
      })
      .expect(201);
    await api().post(`/api/tuition/invoices/${inv.body.data.id}/cancel`).set(auth(t)).expect(201);

    const logs = await api().get("/api/audit-logs").set(auth(t)).expect(200);
    const actions = logs.body.data.map((l: { action: string }) => l.action);
    expect(actions).toContain("member.create");
    expect(actions).toContain("invoice.cancel");

    // Lọc theo action.
    const filtered = await api()
      .get("/api/audit-logs?action=invoice.cancel")
      .set(auth(t))
      .expect(200);
    expect(filtered.body.data.every((l: { action: string }) => l.action === "invoice.cancel")).toBe(
      true,
    );

    // PH không xem được audit.
    await api().get("/api/audit-logs").set(auth(t, p.token)).expect(403);
  });

  // ── G usage (operator) ──
  it("usage overview cho operator: DAU + top event login", async () => {
    await createTenant(app); // phát sinh login → usage event
    const ptoken = await loginPlatform(app);
    const r = await api()
      .get("/api/platform/usage/overview")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .expect(200);
    expect(r.body.data.dau).toBeGreaterThanOrEqual(1);
    expect(r.body.data.tenants).toBeGreaterThanOrEqual(1);
    expect(r.body.data.topEvents.some((e: { type: string }) => e.type === "login")).toBe(true);

    // Tenant thường không xem được usage operator.
    const t = await createTenant(app);
    await api().get("/api/platform/usage/overview").set(auth(t)).expect(403);
    expect(prisma).toBeDefined();
  });

  // ── Dashboard nền tảng (GET /platform/overview) ──
  it("platform overview: KPI + chuỗi MRR 12 tháng + phân bổ gói + 2 list", async () => {
    await createTenant(app);
    const ptoken = await loginPlatform(app);
    const r = await api()
      .get("/api/platform/overview")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .expect(200);

    const d = r.body.data;
    // KPI đầy đủ.
    expect(d.kpis.tenants).toBeGreaterThanOrEqual(1);
    expect(typeof d.kpis.activeTenants).toBe("number");
    expect(typeof d.kpis.trialTenants).toBe("number");
    expect(typeof d.kpis.overdueInvoices).toBe("number");
    expect(typeof d.kpis.suspendedTenants).toBe("number");
    expect(typeof d.kpis.mrr).toBe("number");
    // Chuỗi MRR đúng 12 điểm + % tăng trưởng (luôn là number, có thể 0).
    expect(d.mrrSeries).toHaveLength(12);
    expect(typeof d.mrrGrowthPct).toBe("number");
    // Các list là mảng.
    expect(Array.isArray(d.planDistribution)).toBe(true);
    expect(Array.isArray(d.recentTenants)).toBe(true);
    expect(Array.isArray(d.recentOverdue)).toBe(true);

    // Tenant thường không xem được dashboard nền tảng.
    const t = await createTenant(app);
    await api().get("/api/platform/overview").set(auth(t)).expect(403);
  });

  // ── Doanh thu theo tháng + snapshot MRR (GET /platform/revenue, POST /platform/mrr/backfill) ──
  it("platform revenue: backfill snapshot + chuỗi 24 tháng đầy đủ", async () => {
    await createTenant(app);
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    // Backfill 24 tháng (super-admin) — idempotent, không đè snapshot thực.
    const bf = await api().post("/api/platform/mrr/backfill?months=24").set(phead).expect(201);
    expect(bf.body.data.ok).toBe(true);
    expect(bf.body.data.written).toBeGreaterThanOrEqual(0);

    // Chuỗi 24 tháng: đủ 24 điểm, mới nhất ở cuối, có nguồn (CRON/BACKFILL/DERIVED).
    const r = await api().get("/api/platform/revenue?months=24").set(phead).expect(200);
    expect(r.body.data.months).toBe(24);
    expect(r.body.data.series).toHaveLength(24);
    expect(typeof r.body.data.growthPct).toBe("number");
    expect(["CRON", "BACKFILL", "DERIVED"]).toContain(r.body.data.series[23].source);

    // Quá biên bị kẹp về [1,24].
    const capped = await api().get("/api/platform/revenue?months=99").set(phead).expect(200);
    expect(capped.body.data.months).toBe(24);

    // Tenant thường không xem doanh thu / không backfill được.
    const t = await createTenant(app);
    await api().get("/api/platform/revenue").set(auth(t)).expect(403);
    await api().post("/api/platform/mrr/backfill").set(auth(t)).expect(403);
  });

  // ── Bảng Tenants: stats theo trạng thái + list có MRR/học sinh/chu kỳ + meta phân trang ──
  it("platform tenants: stats + list giàu trường + meta", async () => {
    await createTenant(app);
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    const stats = await api().get("/api/platform/tenants/stats").set(phead).expect(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
    for (const key of ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED"]) {
      expect(typeof stats.body.data[key]).toBe("number");
    }

    const list = await api().get("/api/platform/tenants?page=1").set(phead).expect(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);
    const row = list.body.data[0];
    for (const f of ["studentCount", "mrr", "planTier", "billingCycle"]) {
      expect(row).toHaveProperty(f);
    }

    // Search server-side theo slug: từ khóa không tồn tại → rỗng; theo slug có thật → khớp.
    const none = await api()
      .get("/api/platform/tenants?q=zzz-khong-ton-tai-xyz")
      .set(phead)
      .expect(200);
    expect(none.body.meta.total).toBe(0);
    const hit = await api().get(`/api/platform/tenants?q=${row.slug}`).set(phead).expect(200);
    expect(hit.body.data.some((x: { slug: string }) => x.slug === row.slug)).toBe(true);

    // Detail: getTenant giàu trường (mrr, studentCount, quota usage, cơ sở có _count).
    const detail = await api().get(`/api/platform/tenants/${row.id}`).set(phead).expect(200);
    const dt = detail.body.data;
    expect(typeof dt.mrr).toBe("number");
    expect(typeof dt.studentCount).toBe("number");
    const metrics = dt.quota.map((x: { metric: string }) => x.metric);
    expect(metrics).toEqual(
      expect.arrayContaining(["STUDENTS", "TEACHERS", "CLASSROOMS", "STORAGE_MB"]),
    );
    const sQuota = dt.quota.find((x: { metric: string }) => x.metric === "STUDENTS");
    expect(sQuota).toHaveProperty("used");
    expect(sQuota).toHaveProperty("limit");
    if (dt.schools[0]) expect(dt.schools[0]._count).toHaveProperty("students");

    // Tenant thường không xem stats nền tảng.
    const t = await createTenant(app);
    await api().get("/api/platform/tenants/stats").set(auth(t)).expect(403);
  });
});
