import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AuditService } from "../src/audit/audit.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  PLATFORM_HOST,
  TenantFixture,
  bootstrap,
  createTenant,
  genTaxCode,
  loginPlatform,
  rnd,
} from "./helpers";

describe("G — Notification / Dashboard / Audit / Usage", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let audit: AuditService;
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
    audit = app.get(AuditService);
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
    expect(feed.body.data[0].title).toBe("Có cập nhật sự cố");
    expect(feed.body.data[0].title).not.toContain("Bé G");
    expect(feed.body.data[0].body).toBeNull();
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
    expect(r.body.data).toHaveProperty("overdueInvoices");
    expect(r.body.data.attendanceTrend30d).toHaveLength(30);
    expect(r.body.data.medicineThisMonth).toHaveProperty("PENDING");
    expect(r.body.data.revenueLast6Months).toHaveLength(6);
    expect(Array.isArray(r.body.data.recentAnnouncements)).toBe(true);

    // PH không được xem dashboard quản trị.
    await api().get("/api/dashboard/summary").set(auth(t, p.token)).expect(403);
  });

  // ── G4 Audit ──
  it("ghi audit hành động nhạy cảm và không expose metadata thô", async () => {
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
    expect(actions).toContain("auth.login");
    expect(actions).toContain("member.create");
    expect(actions).toContain("invoice.cancel");
    expect(logs.body.data.every((l: { metadata?: unknown }) => l.metadata === undefined)).toBe(
      true,
    );

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

  it("audit metadata sanitizer redacts secret/PII-like keys before persistence", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const admin = await prisma.system.user.findFirst({
      where: { tenantId: tenant!.id, email: t.email },
    });
    await audit.log({
      tenantId: tenant!.id,
      actorId: admin!.id,
      action: "audit.sanitize.test",
      targetType: "Tenant",
      targetId: tenant!.id,
      metadata: {
        password: "Password123",
        token: "abc",
        role: "SCHOOL_ADMIN",
        nested: { medicineName: "Hapacol", ok: true },
      },
    });

    const row = await prisma.system.auditLog.findFirst({
      where: { tenantId: tenant!.id, action: "audit.sanitize.test" },
      orderBy: { createdAt: "desc" },
    });
    expect(row?.metadata).toMatchObject({
      password: "[REDACTED]",
      token: "[REDACTED]",
      role: "SCHOOL_ADMIN",
      nested: { medicineName: "[REDACTED]", ok: true },
    });
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

  // ── Trang Thuê bao: stats theo trạng thái + list giàu trường (tên trường/MRR/tự gia hạn) ──
  it("platform subscriptions: stats + list giàu trường + lọc trạng thái + 403", async () => {
    await createTenant(app); // tạo 1 subscription FREE ACTIVE
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    const stats = await api().get("/api/platform/subscriptions/stats").set(phead).expect(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
    for (const k of ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED", "EXPIRED"]) {
      expect(typeof stats.body.data[k]).toBe("number");
    }

    const list = await api().get("/api/platform/subscriptions?page=1").set(phead).expect(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);
    const row = list.body.data[0];
    for (const f of ["tenantName", "mrr", "autoRenew", "billingCycle"]) {
      expect(row).toHaveProperty(f);
    }

    // Lọc theo trạng thái ACTIVE → chỉ trả ACTIVE.
    const act = await api().get("/api/platform/subscriptions?status=ACTIVE").set(phead).expect(200);
    expect(act.body.data.every((s: { status: string }) => s.status === "ACTIVE")).toBe(true);

    // Tenant thường không xem stats thuê bao.
    const t = await createTenant(app);
    await api().get("/api/platform/subscriptions/stats").set(auth(t)).expect(403);
  });

  // ── Trang Hóa đơn nền tảng: KPI tiền + list giàu trường (tên trường/kỳ/hạn) + lọc + 403 ──
  it("platform invoices: stats tiền + list giàu trường + lọc + 403", async () => {
    const t = await createTenant(app);
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };
    const tid = (await api().get(`/api/platform/tenants?q=${t.slug}`).set(phead)).body.data[0].id;

    // Tạo 1 hóa đơn nền tảng cho tenant.
    await api().post("/api/platform/invoices").set(phead).send({ tenantId: tid }).expect(201);

    const stats = await api().get("/api/platform/invoices/stats").set(phead).expect(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
    for (const k of ["paidThisMonth", "openAmount", "overdueAmount"]) {
      expect(typeof stats.body.data[k]).toBe("number");
    }

    const list = await api().get("/api/platform/invoices?page=1").set(phead).expect(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);
    const row = list.body.data[0];
    for (const f of ["tenantName", "period", "dueDate", "amountDue"]) {
      expect(row).toHaveProperty(f);
    }

    // Lọc theo trạng thái OPEN → chỉ trả OPEN.
    // "Chờ thu" = mọi HĐ chưa trả (OPEN/OVERDUE), không chỉ status OPEN.
    const open = await api().get("/api/platform/invoices?status=OPEN").set(phead).expect(200);
    expect(
      open.body.data.every((i: { status: string }) => ["OPEN", "OVERDUE"].includes(i.status)),
    ).toBe(true);
    // "Quá hạn" = chưa trả + quá hạn theo ngày → mọi dòng có dueDate < hiện tại.
    const od = await api().get("/api/platform/invoices?status=OVERDUE").set(phead).expect(200);
    expect(
      od.body.data.every((i: { dueDate: string }) => new Date(i.dueDate).getTime() < Date.now()),
    ).toBe(true);

    // Tenant thường không xem stats hóa đơn nền tảng.
    await api().get("/api/platform/invoices/stats").set(auth(t)).expect(403);
  });

  // ── Trang Gói dịch vụ: list giàu trường (tenantCount/giá/limit) + sửa gói + 403 ──
  it("platform plans: list có tenantCount + sửa gói + 403", async () => {
    await createTenant(app); // tạo 1 subscription FREE ACTIVE → tenantCount gói free ≥ 1
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    const list = await api().get("/api/platform/plans").set(phead).expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    const plan = list.body.data.find((p: { code: string }) => p.code === "pro");
    expect(plan).toBeDefined();
    for (const f of ["tenantCount", "prices", "features", "limits", "trialDays"]) {
      expect(plan).toHaveProperty(f);
    }
    expect(typeof plan.tenantCount).toBe("number");
    const free = list.body.data.find((p: { code: string }) => p.code === "free");
    expect(free.tenantCount).toBeGreaterThanOrEqual(1);

    // Sửa gói: đổi mô tả + nâng số ngày dùng thử + upsert giá tháng.
    const upd = await api()
      .patch(`/api/platform/plans/${plan.id}`)
      .set(phead)
      .send({
        description: "Gói chuyên nghiệp (đã sửa)",
        trialDays: 14,
        prices: [{ billingCycle: "MONTHLY", amount: 1_300_000 }],
      })
      .expect(200);
    expect(upd.body.data.trialDays).toBe(14);
    const monthly = upd.body.data.prices.find(
      (x: { billingCycle: string }) => x.billingCycle === "MONTHLY",
    );
    expect(Number(monthly.amount)).toBe(1_300_000);

    // Khôi phục giá để không lệch các test khác chạy chung DB.
    await api()
      .patch(`/api/platform/plans/${plan.id}`)
      .set(phead)
      .send({ trialDays: 0, prices: [{ billingCycle: "MONTHLY", amount: 1_200_000 }] })
      .expect(200);

    // Sửa gói không tồn tại → 404.
    await api()
      .patch("/api/platform/plans/00000000-0000-0000-0000-000000000000")
      .set(phead)
      .send({ name: "x" })
      .expect(404);

    // Tenant thường không sửa được gói.
    const t = await createTenant(app);
    await api()
      .patch(`/api/platform/plans/${plan.id}`)
      .set(auth(t))
      .send({ name: "x" })
      .expect(403);
  });

  // ── Trang Mã giảm giá: tạo (REPEATING + maxRedemptions) + list giàu trường + meta.total + 400/403 ──
  it("platform coupons: tạo + list field UI + meta.total + validation + 403", async () => {
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };
    const code = `KG${Date.now().toString(36).toUpperCase()}`;

    // Tạo coupon % lặp 3 kỳ đầu, giới hạn 100 lượt, có hạn dùng.
    const created = await api()
      .post("/api/platform/coupons")
      .set(phead)
      .send({
        code,
        kind: "PERCENT",
        amount: 25,
        duration: "REPEATING",
        durationCount: 3,
        maxRedemptions: 100,
        validUntil: "2026-08-31",
      })
      .expect(201);
    expect(created.body.data.code).toBe(code);

    // List: có meta.total + mỗi dòng đủ field UI cần (durationCount/maxRedemptions/redeemedCount/validUntil).
    const list = await api().get("/api/platform/coupons?page=1").set(phead).expect(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);
    const row = list.body.data.find((c: { code: string }) => c.code === code);
    expect(row).toBeDefined();
    for (const f of [
      "kind",
      "amount",
      "duration",
      "durationCount",
      "maxRedemptions",
      "redeemedCount",
      "validUntil",
      "isActive",
    ]) {
      expect(row).toHaveProperty(f);
    }
    expect(row.durationCount).toBe(3);
    expect(row.maxRedemptions).toBe(100);
    expect(row.redeemedCount).toBe(0);

    // Lọc isActive=true → mọi dòng isActive.
    const act = await api().get("/api/platform/coupons?isActive=true").set(phead).expect(200);
    expect(act.body.data.every((c: { isActive: boolean }) => c.isActive)).toBe(true);

    // Validation: coupon % > 100 → 400.
    await api()
      .post("/api/platform/coupons")
      .set(phead)
      .send({ code: `BAD${Date.now().toString(36)}`, kind: "PERCENT", amount: 150 })
      .expect(400);

    // Tenant thường không tạo/list coupon nền tảng.
    const t = await createTenant(app);
    await api().get("/api/platform/coupons").set(auth(t)).expect(403);
  });

  // ── Trang Theo dõi vận hành: usage overview (DAU/WAU/MAU) + audit log giàu trường + lọc + 403 ──
  it("platform audit: list giàu trường (tenantName/actor) + lọc action + 403", async () => {
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    // Sinh 1 bản ghi audit nền tảng: tạo tenant rồi impersonate (ghi action platform.tenant.impersonate).
    const slug = `aud-${Date.now().toString(36)}`;
    const created = await api()
      .post("/api/platform/tenants")
      .set(phead)
      .send({
        schoolName: `Audit ${slug}`,
        slug,
        taxCode: genTaxCode(),
        adminEmail: `admin@${slug}.vn`,
        adminPassword: "Password123",
        adminFullName: "Audit Owner",
      })
      .expect(201);
    const tid = created.body.data.tenant.id;
    await api().post(`/api/platform/tenants/${tid}/impersonate`).set(phead).expect(201);

    // List audit: có meta.total + mỗi dòng resolve tenantName/actor + đủ field UI.
    const list = await api().get("/api/platform/audit?page=1").set(phead).expect(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);
    const row = list.body.data[0];
    for (const f of [
      "createdAt",
      "action",
      "actorType",
      "tenantName",
      "actorName",
      "targetType",
      "ip",
    ]) {
      expect(row).toHaveProperty(f);
    }

    // Lọc theo action "impersonate" → mọi dòng chứa "impersonate".
    const imp = await api().get("/api/platform/audit?action=impersonate").set(phead).expect(200);
    expect(imp.body.data.length).toBeGreaterThanOrEqual(1);
    expect(imp.body.data.every((r: { action: string }) => r.action.includes("impersonate"))).toBe(
      true,
    );
    const impRow = imp.body.data.find((r: { tenantId: string }) => r.tenantId === tid);
    expect(impRow.tenantName).toContain(slug);
    expect(impRow.actorType).toBe("PLATFORM");

    // Tenant thường không xem nhật ký nền tảng.
    const t = await createTenant(app);
    await api().get("/api/platform/audit").set(auth(t)).expect(403);
  });

  // ── Trang Cần hành động: phễu trial + quota sắp đầy + công nợ quá hạn + 403 ──
  it("platform worklist: phễu trial + quota sắp đầy + công nợ + 403", async () => {
    const t = await createTenant(app);
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };
    const tid = (await api().get(`/api/platform/tenants?q=${t.slug}`).set(phead)).body.data[0].id;

    // Signup mặc định FREE/ACTIVE → ép thành TRIALING sắp hết hạn (3 ngày) để vào phễu.
    await prisma.system.subscription.update({
      where: { tenantId: tid },
      data: { status: "TRIALING", trialEndsAt: new Date(Date.now() + 3 * 86_400_000) },
    });

    // Tạo usage rồi hạ override xuống rất thấp để row test luôn nằm trong top quota risk,
    // kể cả DB dev/e2e đã có nhiều tenant rác từ lần chạy trước.
    const school = await mainSchool(t);
    const p = await parent(t);
    for (let i = 0; i < 16; i++) await student(t, school, p.userId);
    await prisma.system.tenantEntitlement.create({
      data: {
        tenantId: tid,
        subscriptionId: (
          await prisma.system.subscription.findUniqueOrThrow({ where: { tenantId: tid } })
        ).id,
        metric: "STUDENTS",
        limitValue: 1,
        reason: "e2e quota risk",
      },
    });

    // Tạo hóa đơn rồi đẩy hạn về quá khứ → công nợ quá hạn.
    const inv = await api()
      .post("/api/platform/invoices")
      .set(phead)
      .send({ tenantId: tid })
      .expect(201);
    await prisma.system.platformInvoice.update({
      where: { id: inv.body.data.id },
      data: {
        status: "OPEN",
        dueAt: new Date(Date.now() - 5 * 86_400_000),
        total: 1_200_000,
        amountPaid: 0,
      },
    });

    const wl = (await api().get("/api/platform/worklist").set(phead).expect(200)).body.data;

    // Phễu trial
    expect(wl.trial.active).toBeGreaterThanOrEqual(1);
    expect(wl.trial.expiringSoon).toBeGreaterThanOrEqual(1);
    expect(typeof wl.trial.conversionRate).toBe("number");
    const trialRow = wl.trial.items.find((x: { tenantId: string }) => x.tenantId === tid);
    expect(trialRow).toBeDefined();
    expect(trialRow.tenantName).toBeTruthy();
    expect(trialRow.daysLeft).toBeLessThanOrEqual(3);

    // Công nợ
    expect(wl.dunning.overdueCount).toBeGreaterThanOrEqual(1);
    const dueRow = wl.dunning.items.find((x: { tenantId: string }) => x.tenantId === tid);
    expect(dueRow).toBeDefined();
    expect(dueRow.daysLate).toBeGreaterThanOrEqual(4);
    expect(dueRow.amountDue).toBeGreaterThan(0);

    // Quota risk / cơ hội nâng gói — worklist chỉ trả KPI (không kèm danh sách), chỉ 1 mức >=80%.
    expect(wl.quota.thresholdPct).toBe(80);
    expect(wl.quota.atRisk).toBeGreaterThanOrEqual(1); // STUDENTS 16/1 = 1600% → 1 dòng ≥80%
    expect(wl.quota.tenants).toBeGreaterThanOrEqual(1);
    expect(wl.quota).not.toHaveProperty("items"); // payload nhẹ, danh sách nằm ở trang Trường
    expect(wl.quota).not.toHaveProperty("critical"); // đã bỏ mức ≥90%

    // Filter trang Trường theo cảnh báo quota → trường vượt hạn phải xuất hiện trong danh sách at-risk.
    const listed = await api().get("/api/platform/tenants?quota=at-risk").set(phead).expect(200);
    const listedRow = listed.body.data.find((row: { id: string }) => row.id === tid);
    expect(listedRow).toBeDefined();
    // Cột "Hạn mức": mỗi dòng kèm quota 4 metric (không có SCHOOLS), STUDENTS = 16/1.
    const metrics = listedRow.quota.map((x: { metric: string }) => x.metric);
    expect(metrics).toEqual(["STUDENTS", "TEACHERS", "CLASSROOMS", "STORAGE_MB"]);
    const studentQuota = listedRow.quota.find((x: { metric: string }) => x.metric === "STUDENTS");
    expect(studentQuota).toMatchObject({ used: 16, limit: 1 });

    // Tenant thường không xem worklist nền tảng.
    await api().get("/api/platform/worklist").set(auth(t)).expect(403);
  });

  // ── Trang Cài đặt: get default + patch ngân hàng/grace + 403 (PATCH chỉ SUPER_ADMIN) ──
  it("platform settings: get default + patch bank/grace + 403", async () => {
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    const got = await api().get("/api/platform/settings").set(phead).expect(200);
    expect(typeof got.body.data.pastDueGraceDays).toBe("number");
    expect(typeof got.body.data.suspendedGraceDays).toBe("number");

    const upd = await api()
      .patch("/api/platform/settings")
      .set(phead)
      .send({
        bankBin: "970436",
        bankAccountNumber: "0123456789",
        bankAccountName: "CONG TY KIMTHANH KIDS",
        pastDueGraceDays: 10,
        suspendedGraceDays: 20,
      })
      .expect(200);
    expect(upd.body.data.bankBin).toBe("970436");
    expect(upd.body.data.pastDueGraceDays).toBe(10);

    const got2 = await api().get("/api/platform/settings").set(phead).expect(200);
    expect(got2.body.data.bankAccountNumber).toBe("0123456789");
    expect(got2.body.data.suspendedGraceDays).toBe(20);

    // Tenant thường không sửa cài đặt nền tảng.
    const t = await createTenant(app);
    await api()
      .patch("/api/platform/settings")
      .set(auth(t))
      .send({ pastDueGraceDays: 1 })
      .expect(403);

    // Khôi phục mặc định (singleton dùng chung DB).
    await api()
      .patch("/api/platform/settings")
      .set(phead)
      .send({ pastDueGraceDays: 7, suspendedGraceDays: 14 })
      .expect(200);
  });

  // ── Trường thuê lọc theo Gói + tìm nhanh (search) + 403 ──
  it("platform tenants lọc theo gói + search nhanh trường/hóa đơn + 403", async () => {
    const t = await createTenant(app); // signup mặc định gói FREE
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };

    // Lọc planTier=FREE → mọi dòng đều FREE (tenant tạo qua signup là FREE; demo PRO bị loại).
    const free = await api().get("/api/platform/tenants?planTier=FREE").set(phead).expect(200);
    expect(free.body.data.length).toBeGreaterThanOrEqual(1);
    expect(free.body.data.every((x: { planTier: string }) => x.planTier === "FREE")).toBe(true);

    // Tìm nhanh theo slug → có trường vừa tạo; payload có cả nhánh invoices.
    const r = await api().get(`/api/platform/search?q=${t.slug}`).set(phead).expect(200);
    expect(r.body.data.tenants.some((x: { slug: string }) => x.slug === t.slug)).toBe(true);
    expect(r.body.data).toHaveProperty("invoices");

    // Tenant thường không tìm nhanh nền tảng.
    await api().get("/api/platform/search?q=demo").set(auth(t)).expect(403);
  });

  // ── Chi tiết hóa đơn (admin) + link công khai (token, không auth) + 404 + 403 ──
  it("platform invoice detail + public link token + 404/403", async () => {
    const ptoken = await loginPlatform(app);
    const phead = { Host: PLATFORM_HOST, Authorization: `Bearer ${ptoken}` };
    const t = await createTenant(app);
    const tid = (await api().get(`/api/platform/tenants?q=${t.slug}`).set(phead)).body.data[0].id;
    const inv = await api()
      .post("/api/platform/invoices")
      .set(phead)
      .send({ tenantId: tid })
      .expect(201);
    const invId = inv.body.data.id;

    // Admin: chi tiết đủ trường (bên bán/mua/ngân hàng/dòng) + publicToken.
    const detail = await api().get(`/api/platform/invoices/${invId}`).set(phead).expect(200);
    for (const f of [
      "invoiceNumber",
      "publicToken",
      "buyer",
      "seller",
      "bank",
      "lines",
      "total",
      "amountDue",
    ]) {
      expect(detail.body.data).toHaveProperty(f);
    }
    const token = detail.body.data.publicToken;
    expect(token).toBeTruthy();

    // Công khai (KHÔNG auth): trả đúng số HĐ, KHÔNG lộ id/publicToken nội bộ.
    const pub = await api().get(`/api/public/platform-invoices/${token}`).expect(200);
    expect(pub.body.data.invoiceNumber).toBe(detail.body.data.invoiceNumber);
    expect(pub.body.data.id).toBeUndefined();
    expect(pub.body.data.publicToken).toBeUndefined();
    expect(pub.body.data.buyer).toHaveProperty("name");

    // Token sai → 404.
    await api().get("/api/public/platform-invoices/khong-co-token").expect(404);

    // Tenant thường không xem chi tiết hóa đơn nền tảng (route admin).
    await api().get(`/api/platform/invoices/${invId}`).set(auth(t)).expect(403);
  });
});
