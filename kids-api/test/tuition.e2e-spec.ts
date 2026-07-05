import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TuitionService } from "../src/tuition/tuition.service";
import { TenantFixture, bootstrap, createTenant, rnd } from "./helpers";

describe("E — Học phí (hóa đơn, thanh toán, chứng từ in)", () => {
  let app: INestApplication;
  let tuition: TuitionService;
  const api = () => request(app.getHttpServer());
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
  async function makeStudent(t: TenantFixture, schoolId: string, parentId?: string) {
    const r = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
        fullName: "Bé Học Phí",
        dateOfBirth: "2021-01-01",
        gender: "MALE",
        guardians: parentId ? [{ parentId, relationship: "Mẹ", isPrimary: true }] : undefined,
      })
      .expect(201);
    return r.body.data.id as string;
  }
  const invoiceBody = (studentId: string, due = "2026-07-31") => ({
    studentId,
    period: "2026-07",
    dueDate: due,
    items: [
      { label: "Học phí tháng 7", unitPrice: 2_000_000 },
      { label: "Tiền ăn", quantity: 22, unitPrice: 35_000 },
    ],
    discount: 50_000,
  });

  beforeAll(async () => {
    app = await bootstrap();
    tuition = app.get(TuitionService);
  });
  afterAll(async () => app.close());

  it("tạo hóa đơn (số tuần tự, tổng đúng); PH xem con; PH lạ không thấy", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const parent = await invitedParent(t);
    const other = await invitedParent(t);
    const studentId = await makeStudent(t, school, parent.userId);

    const created = await api()
      .post("/api/tuition/invoices")
      .set(auth(t))
      .send(invoiceBody(studentId))
      .expect(201);
    expect(created.body.data.invoiceNumber).toMatch(/^HD-\d{4}-0001$/);
    expect(Number(created.body.data.total)).toBe(2_000_000 + 22 * 35_000 - 50_000);
    expect(created.body.data.status).toBe("UNPAID");
    expect(created.body.data.items.length).toBe(2);

    const mine = await api()
      .get("/api/tuition/invoices/mine")
      .set(auth(t, parent.token))
      .expect(200);
    expect(mine.body.data.length).toBe(1);

    // PH khác → không thấy
    const otherMine = await api()
      .get("/api/tuition/invoices/mine")
      .set(auth(t, other.token))
      .expect(200);
    expect(otherMine.body.data.length).toBe(0);
    await api()
      .get(`/api/tuition/invoices/${created.body.data.id}`)
      .set(auth(t, other.token))
      .expect(404);
  });

  it("PARENT không tạo hóa đơn (403)", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const parent = await invitedParent(t);
    const studentId = await makeStudent(t, school, parent.userId);
    await api()
      .post("/api/tuition/invoices")
      .set(auth(t, parent.token))
      .send(invoiceBody(studentId))
      .expect(403);
  });

  it("ghi nhận tiền mặt một phần → PARTIAL; trả nốt → PAID", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const studentId = await makeStudent(t, school);
    const inv = (
      await api()
        .post("/api/tuition/invoices")
        .set(auth(t))
        .send(invoiceBody(studentId))
        .expect(201)
    ).body.data;

    await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/manual`)
      .set(auth(t))
      .send({ method: "CASH", amount: 1_000_000 })
      .expect(201);
    let detail = await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).toBe("PARTIAL");

    await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/manual`)
      .set(auth(t))
      .send({ method: "BANK_TRANSFER", reference: "FT123" }) // không truyền amount → trả phần còn lại
      .expect(201);
    detail = await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).toBe("PAID");
    expect(Number(detail.body.data.amountPaid)).toBe(Number(inv.total));
  });

  it("VietQR: trả về payload EMVCo hợp lệ sau khi cấu hình bank", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const studentId = await makeStudent(t, school);
    const inv = (
      await api()
        .post("/api/tuition/invoices")
        .set(auth(t))
        .send(invoiceBody(studentId))
        .expect(201)
    ).body.data;

    // chưa cấu hình bank → 400
    await api().get(`/api/tuition/invoices/${inv.id}/vietqr`).set(auth(t)).expect(400);

    await api()
      .patch("/api/tenant/settings")
      .set(auth(t))
      .send({
        bankBin: "970436",
        bankAccountNumber: "0123456789",
        bankAccountName: "TRUONG MAM NON",
      })
      .expect(200);

    const qr = await api().get(`/api/tuition/invoices/${inv.id}/vietqr`).set(auth(t)).expect(200);
    expect(qr.body.data.payload).toMatch(/^000201/);
    expect(qr.body.data.payload).toContain("970436");
    expect(qr.body.data.amount).toBe(Number(inv.total));
    // CRC: 4 hex cuối, tag 6304 trước đó
    expect(qr.body.data.payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("VNPay: tạo redirectUrl + webhook thành công → PAID; gửi lại → deduped", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const studentId = await makeStudent(t, school);
    const inv = (
      await api()
        .post("/api/tuition/invoices")
        .set(auth(t))
        .send(invoiceBody(studentId))
        .expect(201)
    ).body.data;

    const pay = await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/gateway`)
      .set(auth(t))
      .send({ method: "VNPAY" })
      .expect(201);
    expect(pay.body.data.redirectUrl).toContain("sandbox.vnpayment.vn");
    const gatewayRef = pay.body.data.gatewayRef;

    const payload = { gatewayRef, eventId: `e-${rnd()}`, success: true };
    await api().post("/api/tuition/webhooks/vnpay").send(payload).expect(201);
    const detail = await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).toBe("PAID");

    // Bảo mật: chi tiết hóa đơn (PH cũng xem được) KHÔNG lộ IPN thô/định danh cổng nội bộ.
    const payments = detail.body.data.payments as Record<string, unknown>[];
    expect(payments.length).toBeGreaterThan(0);
    for (const p of payments) {
      expect(p.rawPayload).toBeUndefined();
      expect(p.gatewayRef).toBeUndefined();
      expect(p.reference).toBeUndefined();
      expect(p.recordedById).toBeUndefined();
    }

    // gửi lại cùng giao dịch → không cộng kép
    const again = await api().post("/api/tuition/webhooks/vnpay").send(payload).expect(201);
    expect(again.body.data.deduped).toBe(true);
    const detail2 = await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(t)).expect(200);
    expect(Number(detail2.body.data.amountPaid)).toBe(Number(inv.total));
  });

  it("provider chưa hỗ trợ bị chặn ở webhook tuition (parity với platform) → 400, không cộng tiền", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const studentId = await makeStudent(t, school);
    const inv = (
      await api()
        .post("/api/tuition/invoices")
        .set(auth(t))
        .send(invoiceBody(studentId))
        .expect(201)
    ).body.data;

    const pay = await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/gateway`)
      .set(auth(t))
      .send({ method: "VNPAY" })
      .expect(201);
    const gatewayRef = pay.body.data.gatewayRef;

    // Dù có gatewayRef hợp lệ + success:true + signature, provider lạ vẫn bị chặn ngay ở route.
    const forged = await api()
      .post("/api/tuition/webhooks/momo")
      .send({ gatewayRef, eventId: `momo-${rnd()}`, success: true, signature: "anything" })
      .expect(400);
    expect(forged.body.error.code).toBe("UNSUPPORTED_PROVIDER");

    const detail = await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).not.toBe("PAID");
  });

  it("bản in HTML chứng từ + xuất CSV", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const studentId = await makeStudent(t, school);
    const inv = (
      await api()
        .post("/api/tuition/invoices")
        .set(auth(t))
        .send(invoiceBody(studentId))
        .expect(201)
    ).body.data;

    const html = await api().get(`/api/tuition/invoices/${inv.id}/print`).set(auth(t)).expect(200);
    expect(html.headers["content-type"]).toContain("text/html");
    expect(html.text).toContain("PHIẾU THU HỌC PHÍ");
    expect(html.text).toContain(inv.invoiceNumber);

    const csv = await api().get("/api/tuition/invoices/export").set(auth(t)).expect(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain(inv.invoiceNumber);
  });

  it("hủy hóa đơn chưa thanh toán → CANCELED; quá hạn → OVERDUE (cron)", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const s1 = await makeStudent(t, school);
    const inv1 = (
      await api().post("/api/tuition/invoices").set(auth(t)).send(invoiceBody(s1)).expect(201)
    ).body.data;
    const cancelled = await api()
      .post(`/api/tuition/invoices/${inv1.id}/cancel`)
      .set(auth(t))
      .expect(201);
    expect(cancelled.body.data.status).toBe("CANCELED");

    // hóa đơn quá hạn → markOverdue (cron) chuyển OVERDUE
    const s2 = await makeStudent(t, school);
    const inv2 = (
      await api()
        .post("/api/tuition/invoices")
        .set(auth(t))
        .send(invoiceBody(s2, "2020-01-01"))
        .expect(201)
    ).body.data;
    await tuition.markOverdue();
    const detail = await api().get(`/api/tuition/invoices/${inv2.id}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).toBe("OVERDUE");
  });

  // ─────────── edge-case + RBAC + cô lập ───────────
  it("tạo hóa đơn: giảm giá > tổng → 400; học sinh lạ → 404", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const studentId = await makeStudent(t, school);
    const bad = await api()
      .post("/api/tuition/invoices")
      .set(auth(t))
      .send({ ...invoiceBody(studentId), discount: 999_000_000 })
      .expect(400);
    expect(bad.body.error.code).toBe("BAD_TOTAL");
    await api()
      .post("/api/tuition/invoices")
      .set(auth(t))
      .send({ ...invoiceBody("00000000-0000-0000-0000-000000000000") })
      .expect(404);
  });

  it("list (staff) + lọc theo trạng thái", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const s = await makeStudent(t, school);
    await api().post("/api/tuition/invoices").set(auth(t)).send(invoiceBody(s)).expect(201);
    const all = await api().get("/api/tuition/invoices").set(auth(t)).expect(200);
    expect(all.body.data.length).toBe(1);
    const unpaid = await api().get("/api/tuition/invoices?status=UNPAID").set(auth(t)).expect(200);
    expect(unpaid.body.data.length).toBe(1);
    const paid = await api().get("/api/tuition/invoices?status=PAID").set(auth(t)).expect(200);
    expect(paid.body.data.length).toBe(0);
  });

  it("ghi nhận khi đã trả đủ → ALREADY_PAID; hủy khi đã có thanh toán → HAS_PAYMENT", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const s = await makeStudent(t, school);
    const inv = (
      await api().post("/api/tuition/invoices").set(auth(t)).send(invoiceBody(s)).expect(201)
    ).body.data;
    await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/manual`)
      .set(auth(t))
      .send({ method: "CASH" })
      .expect(201); // trả đủ
    const again = await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/manual`)
      .set(auth(t))
      .send({ method: "CASH", amount: 1000 })
      .expect(400);
    expect(again.body.error.code).toBe("ALREADY_PAID");
    // VietQR / gateway khi không còn nợ
    const cancelPaid = await api()
      .post(`/api/tuition/invoices/${inv.id}/cancel`)
      .set(auth(t))
      .expect(400);
    expect(cancelPaid.body.error.code).toBe("HAS_PAYMENT");
  });

  it("webhook thất bại → không cộng tiền; gatewayRef lạ → ignored", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const s = await makeStudent(t, school);
    const inv = (
      await api().post("/api/tuition/invoices").set(auth(t)).send(invoiceBody(s)).expect(201)
    ).body.data;
    const pay = await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/gateway`)
      .set(auth(t))
      .send({ method: "VNPAY" })
      .expect(201);

    await api()
      .post("/api/tuition/webhooks/vnpay")
      .send({ gatewayRef: pay.body.data.gatewayRef, eventId: `e-${rnd()}`, success: false })
      .expect(201);
    const detail = await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(t)).expect(200);
    expect(detail.body.data.status).toBe("UNPAID");
    expect(Number(detail.body.data.amountPaid)).toBe(0);

    const unknown = await api()
      .post("/api/tuition/webhooks/vnpay")
      .send({ gatewayRef: "khong-ton-tai", eventId: `e-${rnd()}`, success: true })
      .expect(201);
    expect(unknown.body.data.ignored).toBe(true);
  });

  it("RBAC: PH không ghi nhận thanh toán / không hủy hóa đơn (403)", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const parent = await invitedParent(t);
    const s = await makeStudent(t, school, parent.userId);
    const inv = (
      await api().post("/api/tuition/invoices").set(auth(t)).send(invoiceBody(s)).expect(201)
    ).body.data;
    await api()
      .post(`/api/tuition/invoices/${inv.id}/pay/manual`)
      .set(auth(t, parent.token))
      .send({ method: "CASH" })
      .expect(403);
    await api()
      .post(`/api/tuition/invoices/${inv.id}/cancel`)
      .set(auth(t, parent.token))
      .expect(403);
  });

  it("cô lập: tenant B không xem được hóa đơn của tenant A (404)", async () => {
    const A = await createTenant(app);
    const B = await createTenant(app);
    const s = await makeStudent(A, await mainSchool(A));
    const inv = (
      await api().post("/api/tuition/invoices").set(auth(A)).send(invoiceBody(s)).expect(201)
    ).body.data;
    await api().get(`/api/tuition/invoices/${inv.id}`).set(auth(B)).expect(404);
  });
});
