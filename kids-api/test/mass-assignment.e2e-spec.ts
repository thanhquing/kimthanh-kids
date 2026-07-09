import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrap, createTenant, rnd } from "./helpers";

/**
 * Mass-assignment regression (§13): client KHÔNG được tự gắn field nhạy cảm
 * (`tenantId`/`role`/`status`/`platformRole`/`id`...) qua payload.
 * Bảo vệ = Zod object strip key lạ + service set tenantId/type tường minh.
 */
describe("Security — mass-assignment (payload tự gắn field nhạy cảm)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  const tenantIdOf = async (slug: string) => {
    const t = await prisma.system.tenant.findFirst({ where: { slug }, select: { id: true } });
    return t!.id;
  };
  const schoolIdOf = async (tenantId: string) => {
    const s = await prisma.system.school.findFirst({ where: { tenantId }, select: { id: true } });
    return s!.id;
  };

  it("POST /students: tenantId/id/status tự gắn bị bỏ qua (Zod strip + extension override)", async () => {
    const a = await createTenant(app);
    const b = await createTenant(app);
    const tenantA = await tenantIdOf(a.slug);
    const tenantB = await tenantIdOf(b.slug);
    const schoolA = await schoolIdOf(tenantA);
    const forgedId = "00000000-0000-4000-8000-000000000000";

    const res = await api()
      .post("/api/students")
      .set("Host", a.host)
      .set("Authorization", `Bearer ${a.adminToken}`)
      .send({
        schoolId: schoolA,
        fullName: "Bé An",
        dateOfBirth: "2021-05-01",
        gender: "MALE",
        // Field nhạy cảm client cố gắn — phải bị bỏ qua:
        tenantId: tenantB,
        id: forgedId,
        status: "WITHDRAWN",
      })
      .expect(201);

    const createdId = res.body.data.id as string;
    expect(createdId).not.toBe(forgedId);

    const student = await prisma.system.student.findUnique({
      where: { id: createdId },
      select: { tenantId: true, status: true },
    });
    // tenantId bám token (tenant A), KHÔNG phải tenant B client gắn.
    expect(student!.tenantId).toBe(tenantA);
    expect(student!.tenantId).not.toBe(tenantB);
    // status mặc định ACTIVE, KHÔNG phải WITHDRAWN client gắn.
    expect(student!.status).toBe("ACTIVE");
  });

  it("POST /tenant/members: tenantId/platformRole/type tự gắn bị bỏ qua", async () => {
    const a = await createTenant(app);
    const b = await createTenant(app);
    const tenantA = await tenantIdOf(a.slug);
    const tenantB = await tenantIdOf(b.slug);
    const phone = `09${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

    const res = await api()
      .post("/api/tenant/members")
      .set("Host", a.host)
      .set("Authorization", `Bearer ${a.adminToken}`)
      .send({
        fullName: `Cô ${rnd()}`,
        phone,
        role: "TEACHER",
        password: "Password123",
        // Field leo quyền client cố gắn — phải bị bỏ qua:
        tenantId: tenantB,
        platformRole: "PLATFORM_SUPER_ADMIN",
        type: "PLATFORM",
        isActive: false,
      })
      .expect(201);

    const createdId = res.body.data.id as string;
    const user = await prisma.system.user.findUnique({
      where: { id: createdId },
      select: { tenantId: true, type: true, platformRole: true, isActive: true },
    });
    expect(user!.tenantId).toBe(tenantA);
    expect(user!.tenantId).not.toBe(tenantB);
    expect(user!.type).toBe("TENANT"); // KHÔNG bị nâng lên PLATFORM
    expect(user!.platformRole).toBeNull(); // KHÔNG chiếm quyền nền tảng
    expect(user!.isActive).toBe(true); // giá trị mặc định, không theo payload
  });

  it("POST /tenant/members: role=PLATFORM_SUPER_ADMIN (ngoài TenantRole) → 400", async () => {
    const a = await createTenant(app);
    await api()
      .post("/api/tenant/members")
      .set("Host", a.host)
      .set("Authorization", `Bearer ${a.adminToken}`)
      .send({
        fullName: "Kẻ leo quyền",
        phone: `09${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
        role: "PLATFORM_SUPER_ADMIN",
        password: "Password123",
      })
      .expect(400);
  });
});
