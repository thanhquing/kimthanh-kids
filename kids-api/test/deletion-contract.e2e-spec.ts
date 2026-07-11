import { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";
import { bootstrap, createTenant } from "./helpers";

/**
 * Deletion-contract (§10): khóa hành vi FK bảo vệ dữ liệu.
 * - Hard-delete Student khi còn dữ liệu retention → RESTRICT chặn.
 * - Xóa thường Student = soft-delete; chứng từ/y tế vẫn còn cho retention.
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

  it("hard-delete Student khi còn chứng từ/y tế → bị RESTRICT chặn; soft-delete giữ dữ liệu con", async () => {
    const t = await createTenant(app);
    const { tenantId, schoolId } = await scope(t.slug);
    const student = await seedStudent(tenantId, schoolId, "Bé Retention");
    await prisma.system.healthRecord.create({
      data: { tenantId, schoolId, studentId: student.id, date: new Date("2026-07-11") },
    });
    const invoice = await prisma.system.tuitionInvoice.create({
      data: {
        tenantId,
        schoolId,
        studentId: student.id,
        invoiceNumber: `HD-2026-${student.id.slice(0, 4)}`,
        period: "2026-07",
        issueDate: new Date("2026-07-11"),
        dueDate: new Date("2026-07-20"),
        total: 100_000,
      },
    });
    await prisma.system.tuitionPayment.create({
      data: { tenantId, schoolId, invoiceId: invoice.id, method: "CASH", amount: 100_000 },
    });

    await expect(prisma.system.student.delete({ where: { id: student.id } })).rejects.toThrow();

    await prisma.system.student.update({
      where: { id: student.id },
      data: { deletedAt: new Date() },
    });

    await expect(
      prisma.system.healthRecord.count({ where: { studentId: student.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.system.tuitionInvoice.count({ where: { studentId: student.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.system.tuitionPayment.count({ where: { invoiceId: invoice.id } }),
    ).resolves.toBe(1);
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
