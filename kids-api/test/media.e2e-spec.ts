import { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { PLATFORM_HOST, TenantFixture, bootstrap, createTenant, loginPlatform } from "./helpers";

describe("Phase 1 — media (compress + lưu nội bộ + cô lập)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture) => ({ Host: t.host, Authorization: `Bearer ${t.adminToken}` });
  const as = (t: TenantFixture, token = t.adminToken) => ({
    Host: t.host,
    Authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  // Ảnh PNG lớn (2000x2000) chưa nén
  async function bigPng(): Promise<Buffer> {
    return sharp({
      create: { width: 2000, height: 2000, channels: 3, background: { r: 240, g: 100, b: 80 } },
    })
      .png()
      .toBuffer();
  }

  async function mainSchool(t: TenantFixture): Promise<string> {
    const r = await api().get("/api/tenant/schools").set(as(t)).expect(200);
    return r.body.data[0].id;
  }

  async function invitedParent(t: TenantFixture) {
    const email = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@x.vn`;
    const r = await api()
      .post("/api/tenant/members")
      .set(as(t))
      .send({ email, fullName: "Phụ huynh", role: "PARENT", password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
    return { userId: r.body.data.id as string, token: login.body.data.accessToken as string };
  }

  async function memberToken(t: TenantFixture, role: string) {
    const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@x.vn`;
    await api()
      .post("/api/tenant/members")
      .set(as(t))
      .send({ email, fullName: role, role, password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
    return login.body.data.accessToken as string;
  }

  async function classroom(t: TenantFixture, schoolId: string, name: string) {
    const r = await api().post("/api/classrooms").set(as(t)).send({ schoolId, name }).expect(201);
    return r.body.data.id as string;
  }

  async function student(
    t: TenantFixture,
    schoolId: string,
    classroomId: string,
    parentId: string,
  ) {
    const r = await api()
      .post("/api/students")
      .set(as(t))
      .send({
        schoolId,
        classroomId,
        fullName: "Bé Media",
        dateOfBirth: "2021-01-01",
        gender: "MALE",
        guardians: [{ parentId, relationship: "Mẹ", isPrimary: true }],
      })
      .expect(201);
    return r.body.data.id as string;
  }

  async function enableMediaGallery(t: TenantFixture) {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    await api()
      .post(`/api/platform/tenants/${tenant!.id}/entitlements`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ featureKey: "media_gallery", enabled: true })
      .expect(201);
  }

  it("upload ảnh lớn → nén nhỏ hơn nhiều (webp, ≤1280px) + serve được", async () => {
    const t = await createTenant(app);
    const src = await bigPng();

    const up = await api()
      .post("/api/media?kind=REPORT_PHOTO")
      .set(auth(t))
      .attach("file", src, { filename: "photo.png", contentType: "image/png" })
      .expect(201);

    expect(up.body.data.mimeType).toBe("image/webp");
    expect(up.body.data.sizeBytes).toBeLessThan(src.length); // đã nén
    expect(up.body.data.width).toBeLessThanOrEqual(1280); // đã resize
    expect(up.body.data.url).toContain("/api/media/");

    const serve = await api().get(up.body.data.url).set(auth(t)).expect(200);
    expect(serve.headers["content-type"]).toContain("image/webp");
    expect(serve.body.length).toBeGreaterThan(0);

    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const audit = await prisma.system.auditLog.findFirst({
      where: {
        tenantId: tenant!.id,
        action: "media.upload",
        targetType: "Media",
        targetId: up.body.data.id,
      },
    });
    expect(audit?.metadata).toMatchObject({ kind: "REPORT_PHOTO" });
  });

  it("từ chối file không phải ảnh", async () => {
    const t = await createTenant(app);
    const res = await api()
      .post("/api/media")
      .set(auth(t))
      .attach("file", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" })
      .expect(400);
    expect(res.body.error.code).toBe("NOT_IMAGE");
  });

  it("cô lập: tenant B không tải được media của tenant A (404)", async () => {
    const A = await createTenant(app);
    const B = await createTenant(app);
    const up = await api()
      .post("/api/media")
      .set(auth(A))
      .attach("file", await bigPng(), { filename: "p.png", contentType: "image/png" })
      .expect(201);

    await api().get(up.body.data.url).set(auth(B)).expect(404);
  });

  it("cô lập same-tenant: PH chỉ tải được media gắn với album/lớp của con mình", async () => {
    const t = await createTenant(app);
    await enableMediaGallery(t);
    const school = await mainSchool(t);
    const clsA = await classroom(t, school, "Lớp Media A");
    const clsB = await classroom(t, school, "Lớp Media B");
    const pA = await invitedParent(t);
    const pB = await invitedParent(t);
    await student(t, school, clsA, pA.userId);
    await student(t, school, clsB, pB.userId);

    const album = await api()
      .post("/api/albums")
      .set(as(t))
      .send({ classroomId: clsA, title: "Ảnh lớp A" })
      .expect(201);
    const up = await api()
      .post("/api/media?kind=ALBUM")
      .set(as(t))
      .attach("file", await bigPng(), { filename: "a.png", contentType: "image/png" })
      .expect(201);
    await api()
      .post(`/api/albums/${album.body.data.id}/photos`)
      .set(as(t))
      .send({ photos: [{ mediaId: up.body.data.id }] })
      .expect(201);

    await api().get(up.body.data.url).set(as(t, pA.token)).expect(200);
    await api().get(up.body.data.url).set(as(t, pB.token)).expect(404);
  });

  it("upload với kind không hợp lệ → 400 VALIDATION_FAILED (không phải 500 Prisma)", async () => {
    const t = await createTenant(app);
    const res = await api()
      .post("/api/media?kind=BOGUS")
      .set(as(t))
      .attach("file", await bigPng(), { filename: "a.png", contentType: "image/png" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("staff bị giới hạn school không upload media gắn school khác → 403 SCHOOL_FORBIDDEN", async () => {
    const t = await createTenant(app);
    const schoolA = await mainSchool(t);
    const schoolB = (
      await api()
        .post("/api/tenant/schools")
        .set(as(t))
        .send({ name: "Cơ sở Media B", code: "CSMB" })
        .expect(201)
    ).body.data.id;

    // Giáo viên chỉ thuộc school A
    const email = `gv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@x.vn`;
    await api()
      .post("/api/tenant/members")
      .set(as(t))
      .send({
        email,
        fullName: "GV A",
        role: "TEACHER",
        password: "Password123",
        schoolId: schoolA,
      })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
    const gvToken = login.body.data.accessToken as string;

    await api()
      .post(`/api/media?schoolId=${schoolB}`)
      .set(as(t, gvToken))
      .attach("file", await bigPng(), { filename: "a.png", contentType: "image/png" })
      .expect(403);
  });

  it("FINANCE không tải được media/album ảnh trẻ (least-privilege)", async () => {
    const t = await createTenant(app);
    await enableMediaGallery(t);
    const school = await mainSchool(t);
    const cls = await classroom(t, school, "Lớp Finance Media");
    const up = await api()
      .post("/api/media?kind=ALBUM")
      .set(as(t))
      .attach("file", await bigPng(), { filename: "a.png", contentType: "image/png" })
      .expect(201);
    const album = await api()
      .post("/api/albums")
      .set(as(t))
      .send({ classroomId: cls, title: "Ảnh không dành cho kế toán" })
      .expect(201);
    await api()
      .post(`/api/albums/${album.body.data.id}/photos`)
      .set(as(t))
      .send({ photos: [{ mediaId: up.body.data.id }] })
      .expect(201);

    const financeToken = await memberToken(t, "FINANCE");
    await api().get(up.body.data.url).set(as(t, financeToken)).expect(403);
    await api().get("/api/albums").set(as(t, financeToken)).expect(403);
    await api().get(`/api/albums/${album.body.data.id}`).set(as(t, financeToken)).expect(403);
  });

  it("quota STORAGE_MB (override = 0, HARD): upload → 403 STORAGE_EXCEEDED", async () => {
    const t = await createTenant(app);
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    await api()
      .post(`/api/platform/tenants/${tenant!.id}/entitlements`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ metric: "STORAGE_MB", limitValue: 0 })
      .expect(201);

    const res = await api()
      .post("/api/media")
      .set(auth(t))
      .attach("file", await bigPng(), { filename: "p.png", contentType: "image/png" })
      .expect(403);
    expect(res.body.error.code).toBe("STORAGE_EXCEEDED");
  });
});
