import { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrap, createTenant } from "./helpers";

/**
 * Deletion-contract (§10): khóa hành vi FK bảo vệ dữ liệu.
 * - Hard-delete Student → cascade các bản ghi con (erasure 1 trẻ sạch dây).
 * - Hard-delete School/Tenant khi còn con → RESTRICT chặn (không tạo orphan,
 *   không xoá nhầm dây chuyền cả trường/tenant). Offboarding phải là quy trình
 *   ops tường minh, KHÔNG phải một lệnh DELETE lạc.
 * Xóa thường (soft-delete) đi qua `deletedAt` — không physical delete.
 */
describe("Security — deletion contract (FK cascade/restrict)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  const scope = async (slug: string) => {
    const tenant = await prisma.system.tenant.findFirst({ where: { slug }, select: { id: true } });
    const school = await prisma.system.school.findFirst({
      where: { tenantId: tenant!.id },
      select: { id: true },
    });
    return { tenantId: tenant!.id, schoolId: school!.id };
  };

  const seedStudent = async (tenantId: string, schoolId: string, name: string) =>
    prisma.system.student.create({
      data: {
        tenantId,
        schoolId,
        fullName: name,
        dateOfBirth: new Date("2021-05-01"),
        gender: "MALE",
      },
      select: { id: true },
    });

  it("hard-delete Student → cascade xóa bản ghi con (Allergy)", async () => {
    const t = await createTenant(app);
    const { tenantId, schoolId } = await scope(t.slug);
    const student = await seedStudent(tenantId, schoolId, "Bé Cascade");
    await prisma.system.allergy.create({
      data: { tenantId, schoolId, studentId: student.id, allergen: "Đậu phộng" },
    });

    await prisma.system.student.delete({ where: { id: student.id } });

    const remaining = await prisma.system.allergy.count({ where: { studentId: student.id } });
    expect(remaining).toBe(0); // cascade đã dọn con
  });

  it("hard-delete School khi còn Student → bị RESTRICT chặn", async () => {
    const t = await createTenant(app);
    const { tenantId, schoolId } = await scope(t.slug);
    await seedStudent(tenantId, schoolId, "Bé Restrict");

    await expect(prisma.system.school.delete({ where: { id: schoolId } })).rejects.toThrow();
    // School vẫn còn (không bị xoá nhầm)
    const still = await prisma.system.school.findUnique({ where: { id: schoolId } });
    expect(still).not.toBeNull();
  });

  it("hard-delete Tenant khi còn dữ liệu con → bị RESTRICT chặn", async () => {
    const t = await createTenant(app);
    const { tenantId } = await scope(t.slug);

    await expect(prisma.system.tenant.delete({ where: { id: tenantId } })).rejects.toThrow();
    const still = await prisma.system.tenant.findUnique({ where: { id: tenantId } });
    expect(still).not.toBeNull();
  });
});
