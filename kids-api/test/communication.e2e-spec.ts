import { INestApplication } from "@nestjs/common";
import sharp from "sharp";
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

describe("F — Giao tiếp & nội dung (announcements/menu/lesson-plan/album)", () => {
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
  async function invitedMember(t: TenantFixture, role: string, schoolId?: string) {
    const email = `${role.toLowerCase()}-${rnd()}@x.vn`;
    await api()
      .post("/api/tenant/members")
      .set(auth(t))
      .send({ email, fullName: role, role, schoolId, password: "Password123" })
      .expect(201);
    const login = await api()
      .post("/api/auth/login")
      .set("Host", t.host)
      .send({ email, password: "Password123" })
      .expect(201);
    return login.body.data.accessToken as string;
  }
  async function classroom(t: TenantFixture, schoolId: string, name: string) {
    const r = await api().post("/api/classrooms").set(auth(t)).send({ schoolId, name }).expect(201);
    return r.body.data.id as string;
  }
  async function student(
    t: TenantFixture,
    schoolId: string,
    classroomId?: string,
    parentId?: string,
  ) {
    const r = await api()
      .post("/api/students")
      .set(auth(t))
      .send({
        schoolId,
        classroomId,
        fullName: "Bé F",
        dateOfBirth: "2021-01-01",
        gender: "MALE",
        guardians: parentId ? [{ parentId, relationship: "Mẹ", isPrimary: true }] : undefined,
      })
      .expect(201);
    return r.body.data.id as string;
  }
  async function enableFeature(t: TenantFixture, key: string) {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug: t.slug } });
    const ptoken = await loginPlatform(app);
    await api()
      .post(`/api/platform/tenants/${tenant!.id}/entitlements`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${ptoken}`)
      .send({ featureKey: key, enabled: true })
      .expect(201);
  }

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  // ── F1 Announcements ──
  it("thông báo: ALL → PH thấy; CLASS → chỉ PH lớp đó; TEACHERS → PH không thấy; nháp → publish", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const clsA = await classroom(t, school, "Lớp A");
    const clsB = await classroom(t, school, "Lớp B");
    const pA = await invitedParent(t);
    const pB = await invitedParent(t);
    await student(t, school, clsA, pA.userId);
    await student(t, school, clsB, pB.userId);

    await api()
      .post("/api/announcements")
      .set(auth(t))
      .send({ audience: "ALL", schoolId: school, title: "Nghỉ lễ", body: "Trường nghỉ 2/9" })
      .expect(201);
    await api()
      .post("/api/announcements")
      .set(auth(t))
      .send({ audience: "CLASS", classroomId: clsA, title: "Họp lớp A", body: "19h thứ 6" })
      .expect(201);
    await api()
      .post("/api/announcements")
      .set(auth(t))
      .send({ audience: "TEACHERS", schoolId: school, title: "Họp GV", body: "Nội bộ" })
      .expect(201);

    const feedA = await api().get("/api/announcements/feed").set(auth(t, pA.token)).expect(200);
    const titlesA = feedA.body.data.map((a: { title: string }) => a.title);
    expect(titlesA).toContain("Nghỉ lễ");
    expect(titlesA).toContain("Họp lớp A");
    expect(titlesA).not.toContain("Họp GV"); // TEACHERS → PH không thấy

    const feedB = await api().get("/api/announcements/feed").set(auth(t, pB.token)).expect(200);
    const titlesB = feedB.body.data.map((a: { title: string }) => a.title);
    expect(titlesB).toContain("Nghỉ lễ");
    expect(titlesB).not.toContain("Họp lớp A"); // không phải lớp con mình

    // nháp → chưa hiện; publish → hiện
    const draft = await api()
      .post("/api/announcements")
      .set(auth(t))
      .send({ audience: "ALL", schoolId: school, title: "Nháp", body: "x", publish: false })
      .expect(201);
    let feed = await api().get("/api/announcements/feed").set(auth(t, pA.token)).expect(200);
    expect(feed.body.data.map((a: { title: string }) => a.title)).not.toContain("Nháp");
    await api().post(`/api/announcements/${draft.body.data.id}/publish`).set(auth(t)).expect(201);
    feed = await api().get("/api/announcements/feed").set(auth(t, pA.token)).expect(200);
    expect(feed.body.data.map((a: { title: string }) => a.title)).toContain("Nháp");

    // PH không soạn được
    await api()
      .post("/api/announcements")
      .set(auth(t, pA.token))
      .send({ audience: "ALL", schoolId: school, title: "x", body: "y" })
      .expect(403);
  });

  // ── F3 Weekly Menu + cảnh báo dị ứng ──
  it("thực đơn tuần + cảnh báo dị ứng theo Allergy của học sinh", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const parent = await invitedParent(t);
    const sid = await student(t, school, undefined, parent.userId);
    await api()
      .post("/api/allergies")
      .set(auth(t))
      .send({ studentId: sid, allergen: "đậu phộng" })
      .expect(201);

    const menu = await api()
      .post("/api/menus")
      .set(auth(t))
      .send({
        schoolId: school,
        weekStart: "2026-07-06",
        meals: [
          { weekday: 1, mealType: "LUNCH", name: "Cơm gà", ingredients: "gà, cơm" },
          {
            weekday: 2,
            mealType: "SNACK",
            name: "Bánh đậu phộng",
            ingredients: "đậu phộng, đường",
          },
        ],
      })
      .expect(201);
    expect(menu.body.data.meals.length).toBe(2);

    const warn = await api()
      .get(`/api/menus/${menu.body.data.id}/allergy-warnings?studentId=${sid}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(warn.body.data.warnings.length).toBe(1);
    expect(warn.body.data.warnings[0].name).toBe("Bánh đậu phộng");
    expect(warn.body.data.warnings[0].matched).toContain("đậu phộng");

    // PH xem thực đơn của trường con
    const list = await api().get("/api/menus").set(auth(t, parent.token)).expect(200);
    expect(list.body.data.length).toBe(1);
  });

  it("staff school-scope không tạo menu/album trực tiếp vào school khác", async () => {
    const t = await createTenant(app);
    const schoolA = await mainSchool(t);
    const schoolB = (
      await api()
        .post("/api/tenant/schools")
        .set(auth(t))
        .send({ name: "Cơ sở F B", code: "FB" })
        .expect(201)
    ).body.data.id as string;

    const nurseToken = await invitedMember(t, "NURSE", schoolA);
    const menuRes = await api()
      .post("/api/menus")
      .set(auth(t, nurseToken))
      .send({
        schoolId: schoolB,
        weekStart: "2026-07-13",
        meals: [{ weekday: 1, mealType: "LUNCH", name: "Cơm", ingredients: "gạo" }],
      })
      .expect(403);
    expect(menuRes.body.error.code).toBe("SCHOOL_FORBIDDEN");

    await enableFeature(t, "media_gallery");
    const teacherToken = await invitedMember(t, "TEACHER", schoolA);
    const albumRes = await api()
      .post("/api/albums")
      .set(auth(t, teacherToken))
      .send({ schoolId: schoolB, title: "Sai cơ sở" })
      .expect(403);
    expect(albumRes.body.error.code).toBe("SCHOOL_FORBIDDEN");
  });

  // ── F4 Lesson Plan (feature-gated lesson_plan) ──
  it("giáo án: gói Free chặn (FEATURE_NOT_AVAILABLE); bật lesson_plan → tạo được", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const cls = await classroom(t, school, "Lớp Giáo Án");
    const body = {
      classroomId: cls,
      week: "2026-W28",
      theme: "Mùa hè",
      activities: [{ dayOfWeek: 1, startTime: "08:00", title: "Vẽ tranh", materials: "Giấy, màu" }],
    };
    const blocked = await api().post("/api/lesson-plans").set(auth(t)).send(body).expect(403);
    expect(blocked.body.error.code).toBe("FEATURE_NOT_AVAILABLE");

    await enableFeature(t, "lesson_plan");
    const created = await api().post("/api/lesson-plans").set(auth(t)).send(body).expect(201);
    expect(created.body.data.activities.length).toBe(1);
    const got = await api()
      .get(`/api/lesson-plans/${created.body.data.id}`)
      .set(auth(t))
      .expect(200);
    expect(got.body.data.theme).toBe("Mùa hè");
  });

  // ── F5 Album (feature-gated media_gallery) ──
  it("album: gói Free chặn; bật media_gallery → tạo album + gắn ảnh → PH xem", async () => {
    const t = await createTenant(app);
    const school = await mainSchool(t);
    const cls = await classroom(t, school, "Lớp Album");
    const parent = await invitedParent(t);
    await student(t, school, cls, parent.userId);

    await api()
      .post("/api/albums")
      .set(auth(t))
      .send({ classroomId: cls, title: "Dã ngoại" })
      .expect(403); // chưa bật media_gallery

    await enableFeature(t, "media_gallery");
    const album = await api()
      .post("/api/albums")
      .set(auth(t))
      .send({ classroomId: cls, title: "Dã ngoại" })
      .expect(201);

    // upload 1 ảnh qua /media rồi gắn vào album
    const png = await sharp({
      create: { width: 600, height: 400, channels: 3, background: { r: 200, g: 150, b: 100 } },
    })
      .png()
      .toBuffer();
    const up = await api()
      .post("/api/media?kind=ALBUM")
      .set(auth(t))
      .attach("file", png, { filename: "p.png", contentType: "image/png" })
      .expect(201);

    await api()
      .post(`/api/albums/${album.body.data.id}/photos`)
      .set(auth(t))
      .send({ photos: [{ mediaId: up.body.data.id, caption: "Bé chơi" }] })
      .expect(201);

    // Gắn thêm batch thứ 2 → sortOrder phải tiếp nối (1), không đụng ảnh cũ (0)
    const up2 = await api()
      .post("/api/media?kind=ALBUM")
      .set(auth(t))
      .attach("file", png, { filename: "p2.png", contentType: "image/png" })
      .expect(201);
    await api()
      .post(`/api/albums/${album.body.data.id}/photos`)
      .set(auth(t))
      .send({ photos: [{ mediaId: up2.body.data.id, caption: "Bé ăn" }] })
      .expect(201);

    // PH xem album lớp con + có ảnh
    const list = await api().get("/api/albums").set(auth(t, parent.token)).expect(200);
    expect(list.body.data.length).toBe(1);
    const detail = await api()
      .get(`/api/albums/${album.body.data.id}`)
      .set(auth(t, parent.token))
      .expect(200);
    expect(detail.body.data.photos.length).toBe(2);
    expect(detail.body.data.photos[0].media.mimeType).toBe("image/webp");
    // thứ tự tăng dần, không trùng → batch 2 nối tiếp batch 1
    expect(detail.body.data.photos.map((p: { sortOrder: number }) => p.sortOrder)).toEqual([0, 1]);
    expect(detail.body.data.photos[1].caption).toBe("Bé ăn");
  });
});
