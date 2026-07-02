/**
 * Seed dữ liệu DEMO: 1 trường mầm non đầy đủ (gói PRO — bật mọi tính năng) với ~2 THÁNG
 * lịch sử (02/04/2026 → nay): điểm danh/báo cáo/đón-trả theo từng ngày học, học phí & thực đơn
 * theo tháng/tuần. Kèm vài tenant platform case (quota gần đầy, trial sắp hết hạn, công nợ, đủ
 * gói) để dev UI có dữ liệu thật chạy thử. Idempotent: xoá sạch dữ liệu của các slug demo rồi tạo lại
 * (chỉ chạm đúng các tenant demo — an toàn). Chạy SAU prisma:seed (cần các gói đã tồn tại).
 *
 *   pnpm prisma:seed:demo
 *
 * Đăng nhập (host demo.<ROOT_DOMAIN>, mật khẩu chung "Password123"):
 *   admin@hoasen.edu.vn (SCHOOL_ADMIN) · hieutruong@hoasen.edu.vn (PRINCIPAL)
 *   co.mai@hoasen.edu.vn, co.lan@hoasen.edu.vn (TEACHER) · yta.hoa@hoasen.edu.vn (NURSE)
 *   ketoan@hoasen.edu.vn (FINANCE) · ph01@gmail.com … (PARENT)
 */
import {
  AnnouncementAudience,
  AttendanceStatus,
  BillingCycle,
  BillingMode,
  Gender,
  IncidentSeverity,
  LeaveStatus,
  LeaveType,
  MealType,
  MedicineStatus,
  Mood,
  NotificationType,
  PlatformInvoiceStatus,
  PrismaClient,
  Shift,
  SubscriptionStatus,
  TenantRole,
  TenantStatus,
  TuitionInvoiceStatus,
  TuitionPaymentMethod,
  TuitionPaymentStatus,
  UserType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();

const SLUG = "demo";
const PLATFORM_CASE_SLUGS = ["saomai", "bupmang", "rangdong", "tuoitho", "banmai"];
const ROOT = process.env.ROOT_DOMAIN || "kimthanhkids.vn";
const HOST = `${SLUG}.${ROOT}`;
const PASSWORD = "Password123";

/** Ngày (bỏ giờ) — khớp cách lưu cột @db.Date (UTC-midnight của chuỗi YYYY-MM-DD). */
function dateOnly(d: Date): Date {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
/** Thứ 2 của tuần chứa `d` (ISO, 1=Mon). */
function mondayOf(d: Date): Date {
  const day = d.getUTCDay() || 7; // CN=0 → 7
  return dateOnly(addDays(d, 1 - day));
}

/**
 * Tạo media ẢNH thật cho demo: sinh 1 webp đặc (màu bg) ghi xuống MEDIA_ROOT/<tenantId>/<id>.webp
 * để endpoint /media/:id/file (và AuthImage ở FE) render được — placeholder path sẽ 404.
 */
async function createDemoImageMedia(
  tenantId: string,
  schoolId: string,
  uploadedById: string,
  opts: { kind: "ALBUM" | "REPORT_PHOTO"; bg: { r: number; g: number; b: number }; originalName: string },
) {
  const width = 640;
  const height = 428;
  const buf = await sharp({ create: { width, height, channels: 3, background: opts.bg } })
    .webp({ quality: 80 })
    .toBuffer();
  const media = await prisma.media.create({
    data: {
      tenantId,
      schoolId,
      kind: opts.kind,
      path: "pending", // gán lại sau khi có id
      mimeType: "image/webp",
      sizeBytes: buf.length,
      width,
      height,
      originalName: opts.originalName,
      uploadedById,
    },
  });
  const rel = `${tenantId}/${media.id}.webp`;
  const root = process.env.MEDIA_ROOT || "storage";
  await mkdir(join(root, tenantId), { recursive: true });
  await writeFile(join(root, rel), buf);
  await prisma.media.update({ where: { id: media.id }, data: { path: rel } });
  return media;
}

async function wipeExistingDemo(tenantId: string): Promise<void> {
  // Xoá theo thứ tự con → cha (tất cả bảng domain đều có tenantId).
  await prisma.notification.deleteMany({ where: { tenantId } });
  await prisma.notificationPreference.deleteMany({ where: { tenantId } });
  await prisma.usageEvent.deleteMany({ where: { tenantId } });
  await prisma.albumPhoto.deleteMany({ where: { tenantId } });
  await prisma.album.deleteMany({ where: { tenantId } });
  await prisma.activity.deleteMany({ where: { tenantId } });
  await prisma.lessonPlan.deleteMany({ where: { tenantId } });
  await prisma.meal.deleteMany({ where: { tenantId } });
  await prisma.weeklyMenu.deleteMany({ where: { tenantId } });
  await prisma.announcement.deleteMany({ where: { tenantId } });
  await prisma.tuitionPayment.deleteMany({ where: { tenantId } });
  await prisma.tuitionInvoiceItem.deleteMany({ where: { tenantId } });
  await prisma.tuitionInvoice.deleteMany({ where: { tenantId } });
  await prisma.staffAssignment.deleteMany({ where: { tenantId } });
  await prisma.leaveRequest.deleteMany({ where: { tenantId } });
  await prisma.allergy.deleteMany({ where: { tenantId } });
  await prisma.incident.deleteMany({ where: { tenantId } });
  await prisma.medicineStatusHistory.deleteMany({ where: { tenantId } });
  await prisma.medicineRequest.deleteMany({ where: { tenantId } });
  await prisma.healthRecord.deleteMany({ where: { tenantId } });
  await prisma.pickupLog.deleteMany({ where: { tenantId } });
  await prisma.pickupAuthorization.deleteMany({ where: { tenantId } });
  await prisma.dailyReportPhoto.deleteMany({ where: { tenantId } });
  await prisma.dailyReport.deleteMany({ where: { tenantId } });
  await prisma.attendance.deleteMany({ where: { tenantId } });
  await prisma.studentParent.deleteMany({ where: { tenantId } });
  await prisma.student.deleteMany({ where: { tenantId } });
  await prisma.classroom.deleteMany({ where: { tenantId } });
  await prisma.media.deleteMany({ where: { tenantId } });
  await prisma.membership.deleteMany({ where: { tenantId } });
  await prisma.usageCounter.deleteMany({ where: { tenantId } });
  await prisma.tenantEntitlement.deleteMany({ where: { tenantId } });
  await prisma.platformPayment.deleteMany({ where: { tenantId } });
  await prisma.creditLedger.deleteMany({ where: { tenantId } });
  await prisma.platformInvoice.deleteMany({ where: { tenantId } }); // trước subscription (FK)
  await prisma.subscription.deleteMany({ where: { tenantId } });
  await prisma.tenantDomain.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.school.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

async function main() {
  const proPlan = await prisma.plan.findUnique({ where: { code: "pro" } });
  if (!proPlan) throw new Error("Chưa có gói 'pro' — chạy `pnpm prisma:seed` trước.");

  const existing = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await wipeExistingDemo(existing.id);
    // eslint-disable-next-line no-console
    console.log(`Đã xoá dữ liệu demo cũ (tenant ${existing.id}).`);
  }
  for (const slug of PLATFORM_CASE_SLUGS) {
    const t = await prisma.tenant.findUnique({ where: { slug } });
    if (t) {
      await wipeExistingDemo(t.id);
      // eslint-disable-next-line no-console
      console.log(`Đã xoá dữ liệu platform demo cũ (${slug}, tenant ${t.id}).`);
    }
  }

  const now = new Date();
  const today = dateOnly(now);
  const periodEnd = addDays(now, 100 * 365);
  // Lịch sử demo trải từ 02/04/2026 đến hôm nay (điểm danh/báo cáo/đón-trả theo ngày học T2–T6).
  const HISTORY_START = dateOnly(new Date("2026-04-02T00:00:00.000Z"));
  const schoolDays: Date[] = [];
  for (let d = HISTORY_START; d.getTime() <= today.getTime(); d = addDays(d, 1)) {
    const wd = d.getUTCDay();
    if (wd >= 1 && wd <= 5) schoolDays.push(dateOnly(d));
  }
  const lastSchoolDay = schoolDays[schoolDays.length - 1] ?? today;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Tenant + settings + domain + subscription (gói PRO) + school ───
  const tenant = await prisma.tenant.create({
    data: {
      slug: SLUG,
      code: "HOASEN", // mã trường để search/chọn ở login (độc lập subdomain)
      legalName: "Mầm non Hoa Sen",
      taxCode: "0312345673", // MST hợp lệ (đúng checksum)
      status: TenantStatus.ACTIVE,
      planTier: proPlan.tier,
      currentPeriodEnd: periodEnd,
      settings: {
        create: {
          displayName: "Mầm non Hoa Sen",
          primaryColor: "#16a34a",
          secondaryColor: "#f59e0b",
          supportEmail: "lienhe@hoasen.edu.vn",
          taxCode: "0312345673",
          invoiceAddress: "12 Nguyễn Huệ, Quận 1, TP.HCM",
          bankBin: "970436", // Vietcombank
          bankAccountNumber: "0071000123456",
          bankAccountName: "TRUONG MAM NON HOA SEN",
        },
      },
      domains: {
        create: {
          host: HOST,
          type: "SUBDOMAIN",
          status: "ACTIVE",
          isPrimary: true,
          verifiedAt: now,
        },
      },
    },
  });
  const tenantId = tenant.id;

  const subscription = await prisma.subscription.create({
    data: {
      tenantId,
      planId: proPlan.id,
      billingCycle: BillingCycle.MONTHLY,
      billingMode: "GATEWAY",
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // ─── Hóa đơn nền tảng (platform → trường) — số HĐ: SLUG-GÓI-YYYYMMDD-NN ───
  const proMonthly = await prisma.planPrice.findFirst({
    where: { planId: proPlan.id, billingCycle: BillingCycle.MONTHLY },
  });
  const platAmount = proMonthly?.amount ?? 1_200_000;
  const platInvNo = (issued: Date, seq: number) => {
    const y = issued.getFullYear();
    const m = String(issued.getMonth() + 1).padStart(2, "0");
    const d = String(issued.getDate()).padStart(2, "0");
    return `${SLUG}-${proPlan.code}-${y}${m}${d}-${String(seq).padStart(2, "0")}`.toUpperCase();
  };
  const prevIssued = addDays(now, -35);
  const curIssued = addDays(now, -10);
  // HĐ tháng trước — đã thu
  await prisma.platformInvoice.create({
    data: {
      invoiceNumber: platInvNo(prevIssued, 1),
      tenantId,
      subscriptionId: subscription.id,
      status: PlatformInvoiceStatus.PAID,
      periodStart: addDays(prevIssued, -30),
      periodEnd: prevIssued,
      subtotal: platAmount,
      total: platAmount,
      amountPaid: platAmount,
      issuedAt: prevIssued,
      dueAt: addDays(prevIssued, 7),
      paidAt: addDays(prevIssued, 3),
      lines: {
        create: {
          kind: "SUBSCRIPTION",
          label: "Chuyên nghiệp — MONTHLY",
          quantity: 1,
          unitPrice: platAmount,
          amount: platAmount,
        },
      },
    },
  });
  // HĐ kỳ này — chờ thu & đã quá hạn (cho trang Cần hành động)
  await prisma.platformInvoice.create({
    data: {
      invoiceNumber: platInvNo(curIssued, 1),
      tenantId,
      subscriptionId: subscription.id,
      status: PlatformInvoiceStatus.OPEN,
      periodStart: curIssued,
      periodEnd: addDays(curIssued, 30),
      subtotal: platAmount,
      total: platAmount,
      issuedAt: curIssued,
      dueAt: addDays(now, -3),
      lines: {
        create: {
          kind: "SUBSCRIPTION",
          label: "Chuyên nghiệp — MONTHLY",
          quantity: 1,
          unitPrice: platAmount,
          amount: platAmount,
        },
      },
    },
  });

  const school = await prisma.school.create({
    data: { tenantId, name: "Cơ sở Quận 1", code: "MAIN", phone: "02838221234" },
  });
  const schoolId = school.id;

  // ─── Nhân sự ───
  async function createStaff(email: string, fullName: string, role: TenantRole, phone?: string) {
    return prisma.user.create({
      data: {
        type: UserType.TENANT,
        email,
        phone,
        passwordHash,
        fullName,
        tenantId,
        memberships: { create: { tenantId, role, schoolId: null } },
      },
    });
  }
  // Staff cũng đăng nhập bằng SĐT (như phụ huynh) — prefix 0909 để tách khỏi PH (0901).
  const admin = await createStaff(
    "admin@hoasen.edu.vn",
    "Trần Quản Trị",
    TenantRole.SCHOOL_ADMIN,
    "0909000001",
  );
  const hieuTruong = await createStaff(
    "hieutruong@hoasen.edu.vn",
    "Lê Thị Hiệu",
    TenantRole.PRINCIPAL,
    "0909000002",
  );
  const coMai = await createStaff(
    "co.mai@hoasen.edu.vn",
    "Nguyễn Thị Mai",
    TenantRole.TEACHER,
    "0909000010",
  );
  const coLan = await createStaff(
    "co.lan@hoasen.edu.vn",
    "Phạm Thị Lan",
    TenantRole.TEACHER,
    "0909000011",
  );
  const nurse = await createStaff(
    "yta.hoa@hoasen.edu.vn",
    "Đỗ Thị Hoa",
    TenantRole.NURSE,
    "0909000020",
  );
  await createStaff("ketoan@hoasen.edu.vn", "Vũ Kế Toán", TenantRole.FINANCE, "0909000030");

  // ─── Lớp học (GV chủ nhiệm) ───
  const clsMam = await prisma.classroom.create({
    data: {
      tenantId,
      schoolId,
      name: "Lớp Mầm",
      ageGroup: "2-3 tuổi",
      homeroomTeacherId: coMai.id,
    },
  });
  const clsChoi = await prisma.classroom.create({
    data: {
      tenantId,
      schoolId,
      name: "Lớp Chồi",
      ageGroup: "3-4 tuổi",
      homeroomTeacherId: coLan.id,
    },
  });
  const clsLa = await prisma.classroom.create({
    data: { tenantId, schoolId, name: "Lớp Lá", ageGroup: "4-5 tuổi" },
  });
  const classes = [clsMam, clsChoi, clsLa];

  // ─── Phụ huynh + học sinh (4 bé/lớp) ───
  const firstNames = [
    "An",
    "Bình",
    "Chi",
    "Dũng",
    "Giang",
    "Hà",
    "Khánh",
    "Linh",
    "Minh",
    "Nam",
    "Phúc",
    "Quân",
  ];
  interface Kid {
    id: string;
    fullName: string;
    classroomId: string;
    parentId: string;
  }
  const kids: Kid[] = [];
  for (let i = 0; i < 12; i++) {
    const cls = classes[Math.floor(i / 4)];
    const idx = String(i + 1).padStart(2, "0");
    const parent = await prisma.user.create({
      data: {
        type: UserType.TENANT,
        email: `ph${idx}@gmail.com`,
        phone: `09010000${idx}`,
        passwordHash,
        fullName: `Phụ huynh bé ${firstNames[i]}`,
        tenantId,
        memberships: { create: { tenantId, role: TenantRole.PARENT, schoolId: null } },
      },
    });
    const student = await prisma.student.create({
      data: {
        tenantId,
        schoolId,
        classroomId: cls.id,
        fullName: `Nguyễn ${firstNames[i]}`,
        nickname: firstNames[i],
        dateOfBirth: dateOnly(addDays(today, -(900 + i * 30))),
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        parents: {
          create: { tenantId, parentId: parent.id, relationship: "Mẹ", isPrimary: true },
        },
      },
    });
    kids.push({
      id: student.id,
      fullName: student.fullName,
      classroomId: cls.id,
      parentId: parent.id,
    });
  }

  // ─── Phân công tuần (T2–T6) ───
  for (let weekday = 1; weekday <= 5; weekday++) {
    await prisma.staffAssignment.createMany({
      data: [
        {
          tenantId,
          schoolId,
          staffId: coMai.id,
          classroomId: clsMam.id,
          weekday,
          shift: Shift.FULL_DAY,
          duty: "GV chính",
        },
        {
          tenantId,
          schoolId,
          staffId: coLan.id,
          classroomId: clsChoi.id,
          weekday,
          shift: Shift.FULL_DAY,
          duty: "GV chính",
        },
        {
          tenantId,
          schoolId,
          staffId: nurse.id,
          classroomId: null,
          weekday,
          shift: Shift.FULL_DAY,
          duty: "Trực y tế",
        },
      ],
    });
  }

  // ─── Điểm danh mỗi ngày học trong 2 tháng (đa số có mặt, rải rác muộn/vắng) ───
  await prisma.attendance.createMany({
    data: schoolDays.flatMap((date, dayIdx) =>
      kids.map((k, i) => {
        const roll = (dayIdx * 7 + i * 3) % 20; // biến thiên tất định
        const status =
          roll === 0
            ? AttendanceStatus.ABSENT
            : roll === 1
              ? AttendanceStatus.LATE
              : AttendanceStatus.PRESENT;
        return {
          tenantId,
          schoolId,
          studentId: k.id,
          classroomId: k.classroomId,
          date,
          status,
          checkInAt:
            status === AttendanceStatus.ABSENT
              ? null
              : new Date(`${date.toISOString().slice(0, 10)}T${status === AttendanceStatus.LATE ? "08:15" : "07:30"}:00.000Z`),
        };
      }),
    ),
  });

  // ─── Báo cáo hằng ngày cho lớp Mầm, mỗi ngày học trong 2 tháng ───
  const moods = [Mood.HAPPY, Mood.NEUTRAL, Mood.TIRED, Mood.HAPPY, Mood.FUSSY];
  const mealNotes = ["Ăn hết suất", "Ăn khá, còn ít canh", "Ăn chậm, cần nhắc", "Ăn hết suất, xin thêm"];
  const activityNotes = [
    "Vẽ tranh, hát, chơi ngoài trời",
    "Kể chuyện, xếp hình, vận động",
    "Học chữ cái, tô màu, chơi cát",
    "Âm nhạc, đóng kịch, chăm cây",
  ];
  const mamKids = kids.filter((k) => k.classroomId === clsMam.id);
  await prisma.dailyReport.createMany({
    data: schoolDays.flatMap((date, dayIdx) =>
      mamKids.map((k, i) => ({
        tenantId,
        schoolId,
        studentId: k.id,
        classroomId: clsMam.id,
        date,
        mood: moods[(dayIdx + i) % moods.length],
        meals: mealNotes[(dayIdx + i) % mealNotes.length],
        nap: dayIdx % 4 === 0 ? "Khó ngủ, ngủ 45 phút" : "Ngủ ngon 90 phút",
        activities: activityNotes[(dayIdx + i) % activityNotes.length],
        authorId: coMai.id,
      })),
    ),
  });

  // ─── Ảnh đính kèm báo cáo hằng ngày (báo cáo của lớp Mầm ngày học gần nhất) ───
  const mamReports = await prisma.dailyReport.findMany({
    where: { tenantId, classroomId: clsMam.id, date: lastSchoolDay },
    orderBy: { studentId: "asc" },
    select: { id: true },
  });
  const reportBgs = [
    { r: 244, g: 180, b: 90 },
    { r: 120, g: 190, b: 140 },
    { r: 130, g: 170, b: 235 },
  ];
  const reportMedia = [];
  for (let n = 0; n < reportBgs.length; n++) {
    reportMedia.push(
      await createDemoImageMedia(tenantId, schoolId, coMai.id, {
        kind: "REPORT_PHOTO",
        bg: reportBgs[n],
        originalName: `hoat-dong-${n + 1}.webp`,
      }),
    );
  }
  if (mamReports[0]) {
    await prisma.dailyReportPhoto.createMany({
      data: [
        { tenantId, reportId: mamReports[0].id, mediaId: reportMedia[0].id, caption: "Giờ vẽ tranh", sortOrder: 0 },
        { tenantId, reportId: mamReports[0].id, mediaId: reportMedia[1].id, caption: "Chơi ngoài trời", sortOrder: 1 },
      ],
    });
  }
  if (mamReports[1]) {
    await prisma.dailyReportPhoto.create({
      data: { tenantId, reportId: mamReports[1].id, mediaId: reportMedia[2].id, caption: "Giờ ăn trưa", sortOrder: 0 },
    });
  }

  // ─── Đón/trả: người đón được ủy quyền + nhật ký ra/vào cổng ───
  const atDay = (date: Date, hhmm: string) =>
    new Date(`${date.toISOString().slice(0, 10)}T${hhmm}:00.000Z`);
  // kids[0]: mẹ (gắn tài khoản PH) + bà ngoại (khách được ủy quyền)
  const authMom = await prisma.pickupAuthorization.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[0].id,
      parentUserId: kids[0].parentId,
      guardianName: `Phụ huynh bé ${kids[0].fullName.split(" ").pop()}`,
      guardianPhone: "0901000001",
      relationship: "Mẹ",
      createdById: admin.id,
    },
  });
  const authGrandma = await prisma.pickupAuthorization.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[0].id,
      guardianName: "Bà Nguyễn Thị Tư",
      guardianPhone: "0903000001",
      relationship: "Bà ngoại",
      note: "Chỉ đón chiều thứ 6",
      createdById: admin.id,
    },
  });
  // kids[1]: bố; kids[2]: chú (khách)
  const authDad = await prisma.pickupAuthorization.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[1].id,
      parentUserId: kids[1].parentId,
      guardianName: `Phụ huynh bé ${kids[1].fullName.split(" ").pop()}`,
      guardianPhone: "0901000002",
      relationship: "Bố",
      createdById: admin.id,
    },
  });
  await prisma.pickupAuthorization.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[2].id,
      guardianName: "Ông Trần Văn Năm",
      guardianPhone: "0903000002",
      relationship: "Chú",
      createdById: admin.id,
    },
  });
  // Nhật ký mỗi ngày học: kids[0] (mẹ đưa; bà ngoại đón chiều T6) + kids[1] (bố đưa/đón).
  await prisma.pickupLog.createMany({
    data: schoolDays.flatMap((date, dayIdx) => {
      const rows: {
        tenantId: string;
        schoolId: string;
        studentId: string;
        authorizationId: string;
        eventType: "CHECK_IN" | "CHECK_OUT";
        guardianName: string;
        guardianPhone: string | null;
        occurredAt: Date;
        recordedById: string;
      }[] = [];
      const isFriday = date.getUTCDay() === 5;
      // kids[0] có mặt (bỏ ngày vắng: roll0 === 0)
      if ((dayIdx * 7) % 20 !== 0) {
        rows.push({
          tenantId,
          schoolId,
          studentId: kids[0].id,
          authorizationId: authMom.id,
          eventType: "CHECK_IN",
          guardianName: authMom.guardianName,
          guardianPhone: authMom.guardianPhone,
          occurredAt: atDay(date, "07:35"),
          recordedById: coMai.id,
        });
        const pickup = isFriday ? authGrandma : authMom;
        rows.push({
          tenantId,
          schoolId,
          studentId: kids[0].id,
          authorizationId: pickup.id,
          eventType: "CHECK_OUT",
          guardianName: pickup.guardianName,
          guardianPhone: pickup.guardianPhone,
          occurredAt: atDay(date, "16:40"),
          recordedById: coMai.id,
        });
      }
      // kids[1] có mặt (bỏ ngày vắng: roll1 === 0)
      if ((dayIdx * 7 + 3) % 20 !== 0) {
        rows.push({
          tenantId,
          schoolId,
          studentId: kids[1].id,
          authorizationId: authDad.id,
          eventType: "CHECK_IN",
          guardianName: authDad.guardianName,
          guardianPhone: authDad.guardianPhone,
          occurredAt: atDay(date, "07:50"),
          recordedById: coLan.id,
        });
        rows.push({
          tenantId,
          schoolId,
          studentId: kids[1].id,
          authorizationId: authDad.id,
          eventType: "CHECK_OUT",
          guardianName: authDad.guardianName,
          guardianPhone: authDad.guardianPhone,
          occurredAt: atDay(date, "17:05"),
          recordedById: coLan.id,
        });
      }
      return rows;
    }),
  });

  // ─── Sức khỏe: chỉ số tăng trưởng theo tháng (đầu mỗi tháng trong lịch sử) + dị ứng + thuốc + sự cố ───
  const healthDates = [HISTORY_START, dateOnly(addDays(HISTORY_START, 30)), dateOnly(addDays(HISTORY_START, 60)), today];
  for (const [ki, k] of kids.slice(0, 4).entries()) {
    await prisma.healthRecord.createMany({
      data: healthDates.map((date, mi) => ({
        tenantId,
        schoolId,
        studentId: k.id,
        date,
        heightCm: 92 + ki * 0.8 + mi * 0.7, // tăng dần theo tháng
        weightKg: 13 + ki * 0.4 + mi * 0.3,
        recordedById: nurse.id,
      })),
    });
  }
  await prisma.allergy.createMany({
    data: [
      { tenantId, schoolId, studentId: kids[0].id, allergen: "đậu phộng", note: "Dị ứng nặng" },
      { tenantId, schoolId, studentId: kids[1].id, allergen: "hải sản" },
    ],
  });

  const medApproved = await prisma.medicineRequest.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[2].id,
      medicineName: "Hapacol 150mg",
      dosage: "1 gói",
      schedule: "sau ăn trưa",
      startDate: today,
      endDate: addDays(today, 2),
      reason: "Hạ sốt",
      status: MedicineStatus.APPROVED,
      requestedById: kids[2].parentId,
      handledById: nurse.id,
      handledAt: now,
    },
  });
  await prisma.medicineStatusHistory.create({
    data: {
      tenantId,
      requestId: medApproved.id,
      status: MedicineStatus.APPROVED,
      note: "Đã xác nhận liều với phụ huynh",
      actorId: nurse.id,
    },
  });
  await prisma.medicineRequest.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[6].id,
      medicineName: "Siro ho",
      dosage: "5ml",
      schedule: "sáng, chiều",
      startDate: today,
      endDate: addDays(today, 3),
      reason: "Ho nhẹ",
      status: MedicineStatus.PENDING,
      requestedById: kids[6].parentId,
    },
  });

  await prisma.incident.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[5].id,
      date: today,
      type: "Té ngã",
      severity: IncidentSeverity.LOW,
      description: "Bé trượt ngã ở sân chơi, trầy nhẹ đầu gối.",
      actionTaken: "Sát trùng, dán băng cá nhân, theo dõi.",
      reportedById: nurse.id,
    },
  });

  // ─── Đơn xin nghỉ ───
  await prisma.leaveRequest.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[7].id,
      leaveType: LeaveType.SICK,
      startDate: addDays(today, 1),
      endDate: addDays(today, 2),
      reason: "Bé bị cảm, nghỉ theo dõi.",
      status: LeaveStatus.PENDING,
      requestedById: kids[7].parentId,
    },
  });
  await prisma.leaveRequest.create({
    data: {
      tenantId,
      schoolId,
      studentId: kids[8].id,
      leaveType: LeaveType.FAMILY,
      startDate: addDays(today, -3),
      endDate: addDays(today, -3),
      reason: "Về quê có việc gia đình.",
      status: LeaveStatus.APPROVED,
      requestedById: kids[8].parentId,
      handledById: admin.id,
      handledAt: now,
      decisionNote: "Đã duyệt.",
    },
  });

  // ─── Thực đơn tuần (T2–T6) cho mỗi tuần trong lịch sử; tuần có món đậu phộng minh hoạ cảnh báo dị ứng ───
  const lunchRotation = [
    { name: "Cơm gà, canh rau ngót", ingredients: "gà, gạo, rau ngót" },
    { name: "Cơm cá kho, canh bí đỏ", ingredients: "cá, gạo, bí đỏ" },
    { name: "Cơm thịt viên, canh cải", ingredients: "thịt heo, gạo, cải xanh" },
    { name: "Mì bò rau củ", ingredients: "bò, mì, cà rốt, khoai tây" },
  ];
  const menuWeeks: Date[] = [];
  for (let w = mondayOf(HISTORY_START); w.getTime() <= mondayOf(now).getTime(); w = addDays(w, 7)) {
    menuWeeks.push(dateOnly(w));
  }
  for (const [wi, weekStart] of menuWeeks.entries()) {
    const lunch = lunchRotation[wi % lunchRotation.length];
    await prisma.weeklyMenu.create({
      data: {
        tenantId,
        schoolId,
        weekStart,
        note: "Thực đơn tuần (áp dụng toàn trường)",
        createdById: admin.id,
        meals: {
          create: [1, 2, 3, 4, 5].flatMap((weekday) => [
            {
              tenantId,
              weekday,
              mealType: MealType.LUNCH,
              name: lunch.name,
              ingredients: lunch.ingredients,
            },
            {
              tenantId,
              weekday,
              mealType: MealType.SNACK,
              name: weekday === 3 ? "Bánh quy bơ đậu phộng" : "Sữa chua trái cây",
              ingredients: weekday === 3 ? "bột mì, bơ, đậu phộng" : "sữa chua, xoài, chuối",
            },
          ]),
        },
      },
    });
  }

  // ─── Thông báo ───
  await prisma.announcement.create({
    data: {
      tenantId,
      schoolId,
      audience: AnnouncementAudience.ALL,
      title: "Nghỉ lễ Quốc khánh 2/9",
      body: "Nhà trường nghỉ lễ ngày 2/9. Chúc các gia đình kỳ nghỉ vui vẻ!",
      publishedAt: now,
      authorId: admin.id,
    },
  });
  await prisma.announcement.create({
    data: {
      tenantId,
      schoolId,
      audience: AnnouncementAudience.CLASS,
      classroomId: clsMam.id,
      title: "Họp phụ huynh lớp Mầm",
      body: "Mời quý phụ huynh họp lúc 17h thứ 6 tuần này.",
      publishedAt: now,
      authorId: coMai.id,
    },
  });

  // ─── Học phí theo THÁNG suốt lịch sử: tháng cũ đã thu đủ; tháng hiện tại có bé đã trả / trả 1 phần / chưa trả ───
  const year = today.getUTCFullYear();
  const currentPeriod = `${year}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const billingMonths: { period: string; issueDate: Date }[] = [];
  for (let y = HISTORY_START.getUTCFullYear(), m = HISTORY_START.getUTCMonth(); ; ) {
    billingMonths.push({
      period: `${y}-${String(m + 1).padStart(2, "0")}`,
      issueDate: dateOnly(new Date(Date.UTC(y, m, 1))),
    });
    if (y === year && m === today.getUTCMonth()) break;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  for (const bm of billingMonths) {
    const isCurrent = bm.period === currentPeriod;
    for (const [ki, k] of kids.entries()) {
      const tuition = 2_000_000;
      const meal = 770_000; // 22 buổi x 35k
      const discount = ki === 0 ? 100_000 : 0;
      const subtotal = tuition + meal;
      const total = subtotal - discount;
      const invoiceNumber = `HD-${bm.period}-${String(ki + 1).padStart(4, "0")}`;
      // Tháng cũ: đã thu đủ. Tháng hiện tại: bé#2 đã trả, bé#3 trả 1 phần, còn lại chưa trả.
      let amountPaid = total;
      let status: TuitionInvoiceStatus = TuitionInvoiceStatus.PAID;
      if (isCurrent) {
        if (ki === 1) {
          amountPaid = total;
          status = TuitionInvoiceStatus.PAID;
        } else if (ki === 2) {
          amountPaid = 1_000_000;
          status = TuitionInvoiceStatus.PARTIAL;
        } else {
          amountPaid = 0;
          status = TuitionInvoiceStatus.UNPAID;
        }
      }

      const invoice = await prisma.tuitionInvoice.create({
        data: {
          tenantId,
          schoolId,
          studentId: k.id,
          invoiceNumber,
          period: bm.period,
          issueDate: bm.issueDate,
          dueDate: addDays(bm.issueDate, 10),
          subtotal,
          discount,
          total,
          amountPaid,
          status,
          createdById: admin.id,
          items: {
            create: [
              { tenantId, label: "Học phí tháng", quantity: 1, unitPrice: tuition, amount: tuition },
              { tenantId, label: "Tiền ăn (22 buổi)", quantity: 22, unitPrice: 35_000, amount: meal },
            ],
          },
        },
      });
      if (amountPaid > 0) {
        await prisma.tuitionPayment.create({
          data: {
            tenantId,
            schoolId,
            invoiceId: invoice.id,
            method: TuitionPaymentMethod.CASH,
            status: TuitionPaymentStatus.SUCCEEDED,
            amount: amountPaid,
            reference: "Thu tại văn phòng",
            paidAt: addDays(bm.issueDate, 5),
            recordedById: admin.id,
          },
        });
      }
    }
  }

  // ─── Giáo án (PRO) ───
  await prisma.lessonPlan.create({
    data: {
      tenantId,
      schoolId,
      classroomId: clsMam.id,
      week: `${year}-W${String(Math.ceil(((+today - +dateOnly(new Date(`${year}-01-01`))) / 86_400_000 + 1) / 7)).padStart(2, "0")}`,
      theme: "Thế giới động vật",
      authorId: coMai.id,
      activities: {
        create: [
          {
            tenantId,
            dayOfWeek: 1,
            startTime: "09:00",
            title: "Kể chuyện: Chú thỏ thông minh",
            materials: "Sách tranh, rối tay",
          },
          {
            tenantId,
            dayOfWeek: 3,
            startTime: "09:00",
            title: "Vẽ con vật em yêu thích",
            materials: "Giấy, màu sáp",
          },
        ],
      },
    },
  });

  // ─── Album ảnh (PRO) — media ảnh thật + 1 ảnh trong album ───
  const media = await createDemoImageMedia(tenantId, schoolId, coMai.id, {
    kind: "ALBUM",
    bg: { r: 150, g: 200, b: 120 },
    originalName: "da-ngoai.webp",
  });
  await prisma.album.create({
    data: {
      tenantId,
      schoolId,
      classroomId: clsMam.id,
      title: "Dã ngoại công viên",
      description: "Buổi dã ngoại của lớp Mầm.",
      createdById: coMai.id,
      photos: {
        create: [{ tenantId, mediaId: media.id, caption: "Các bé vui chơi", sortOrder: 0 }],
      },
    },
  });

  // ─── Vài thông báo in-app cho 1 phụ huynh (để feed không rỗng) ───
  await prisma.notification.createMany({
    data: [
      {
        tenantId,
        userId: kids[0].parentId,
        type: NotificationType.ANNOUNCEMENT,
        title: "Nghỉ lễ Quốc khánh 2/9",
        linkType: "Announcement",
      },
      {
        tenantId,
        userId: kids[0].parentId,
        type: NotificationType.INVOICE,
        title: `Hóa đơn học phí HD-${currentPeriod}-0001`,
        body: "Vui lòng thanh toán trước hạn.",
        linkType: "TuitionInvoice",
      },
    ],
  });

  // ─── Audit log mẫu (vài hành động gần đây) ───
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId,
        actorId: admin.id,
        actorType: UserType.TENANT,
        action: "tenant.settings.update",
        targetType: "TenantSettings",
        targetId: tenantId,
        metadata: { schoolName: tenant.legalName },
        createdAt: new Date(now.getTime() - 2 * 3_600_000),
      },
      {
        tenantId,
        actorId: admin.id,
        actorType: UserType.TENANT,
        action: "member.invite",
        targetType: "User",
        targetId: coMai.id,
        metadata: { email: "co.mai@hoasen.edu.vn", role: "TEACHER" },
        createdAt: new Date(now.getTime() - 6 * 3_600_000),
      },
      {
        tenantId,
        actorId: hieuTruong.id,
        actorType: UserType.TENANT,
        action: "classroom.create",
        targetType: "Classroom",
        targetId: clsLa.id,
        metadata: { name: "Lớp Lá" },
        createdAt: new Date(now.getTime() - 24 * 3_600_000),
      },
    ],
  });

  // ─── Notification preferences mẫu (bật/tắt kênh) ───
  await prisma.notificationPreference.createMany({
    data: [
      { tenantId, userId: admin.id, type: NotificationType.INVOICE, enabled: true },
      { tenantId, userId: admin.id, type: NotificationType.ANNOUNCEMENT, enabled: true },
      { tenantId, userId: coMai.id, type: NotificationType.ATTENDANCE, enabled: true },
      { tenantId, userId: coMai.id, type: NotificationType.DAILY_REPORT, enabled: true },
      { tenantId, userId: nurse.id, type: NotificationType.MEDICINE, enabled: true },
      { tenantId, userId: nurse.id, type: NotificationType.INCIDENT, enabled: true },
    ],
  });

  // ─── Vài usage event (login) rải vài ngày để overview có DAU/WAU ───
  await prisma.usageEvent.createMany({
    data: [0, 0, 1, 2, 6].map((daysAgo, i) => ({
      tenantId,
      userId: i % 2 === 0 ? admin.id : coMai.id,
      type: "login",
      createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
    })),
  });

  async function seedPlatformCase(args: {
    slug: string;
    legalName: string;
    taxCode: string;
    planCode: string;
    billingCycle?: BillingCycle;
    billingMode?: BillingMode;
    tenantStatus?: TenantStatus;
    subscriptionStatus?: SubscriptionStatus;
    trialEndsInDays?: number;
    pastDueDays?: number;
    students: number;
    classrooms: number;
    teachers: number;
    storageMb?: number;
    invoiceAmount?: number;
    overdueInvoice?: { daysLate: number; amountPaid?: number };
    paidInvoice?: boolean;
  }) {
    const plan = await prisma.plan.findUnique({
      where: { code: args.planCode },
      include: { prices: true },
    });
    if (!plan) throw new Error(`Chưa có gói '${args.planCode}' — chạy prisma:seed trước.`);

    const billingCycle = args.billingCycle ?? BillingCycle.MONTHLY;
    const planPrice = plan.prices.find((p) => p.billingCycle === billingCycle) ?? plan.prices[0];
    const planCode = plan.code;
    const planName = plan.name;
    const invoiceAmount = args.invoiceAmount ?? Number(planPrice?.amount ?? 0);
    const host = `${args.slug}.${ROOT}`;
    const displayName = args.legalName;
    const trialEndsAt =
      args.trialEndsInDays !== undefined ? addDays(now, args.trialEndsInDays) : undefined;
    const pastDueSince =
      args.pastDueDays !== undefined ? addDays(now, -args.pastDueDays) : undefined;
    const currentPeriodEnd = addDays(
      now,
      args.subscriptionStatus === SubscriptionStatus.TRIALING ? 14 : 30,
    );

    const seededTenant = await prisma.tenant.create({
      data: {
        slug: args.slug,
        code: args.slug.toUpperCase(), // mã trường để search/chọn ở login
        legalName: args.legalName,
        taxCode: args.taxCode,
        status:
          args.tenantStatus ??
          (args.subscriptionStatus === SubscriptionStatus.TRIALING
            ? TenantStatus.TRIAL
            : args.subscriptionStatus === SubscriptionStatus.PAST_DUE
              ? TenantStatus.PAST_DUE
              : TenantStatus.ACTIVE),
        planTier: plan.tier,
        currentPeriodEnd,
        trialEndsAt,
        settings: {
          create: {
            displayName,
            primaryColor: "#2563eb",
            secondaryColor: "#f97316",
            supportEmail: `lienhe@${args.slug}.edu.vn`,
            taxCode: args.taxCode,
            invoiceAddress: "TP.HCM",
            bankBin: "970436",
            bankAccountNumber: `1027${args.taxCode.slice(-6)}`,
            bankAccountName: displayName.toUpperCase(),
          },
        },
        domains: {
          create: {
            host,
            type: "SUBDOMAIN",
            status: "ACTIVE",
            isPrimary: true,
            verifiedAt: now,
          },
        },
      },
    });

    const sub = await prisma.subscription.create({
      data: {
        tenantId: seededTenant.id,
        planId: plan.id,
        billingCycle,
        billingMode: args.billingMode ?? BillingMode.GATEWAY,
        status: args.subscriptionStatus ?? SubscriptionStatus.ACTIVE,
        currentPeriodStart: addDays(now, -15),
        currentPeriodEnd,
        trialEndsAt,
        pastDueSince,
      },
    });

    const seededSchool = await prisma.school.create({
      data: {
        tenantId: seededTenant.id,
        name: "Cơ sở chính",
        code: "MAIN",
        phone: "02839990000",
      },
    });

    const seededAdmin = await prisma.user.create({
      data: {
        type: UserType.TENANT,
        email: `admin@${args.slug}.edu.vn`,
        passwordHash,
        fullName: "Quản trị trường",
        tenantId: seededTenant.id,
        memberships: {
          create: { tenantId: seededTenant.id, role: TenantRole.SCHOOL_ADMIN, schoolId: null },
        },
      },
    });

    const teacherIds: string[] = [];
    for (let i = 0; i < args.teachers; i++) {
      const teacher = await prisma.user.create({
        data: {
          type: UserType.TENANT,
          email: `gv${String(i + 1).padStart(2, "0")}@${args.slug}.edu.vn`,
          passwordHash,
          fullName: `Giáo viên ${i + 1}`,
          tenantId: seededTenant.id,
          memberships: {
            create: { tenantId: seededTenant.id, role: TenantRole.TEACHER, schoolId: null },
          },
        },
      });
      teacherIds.push(teacher.id);
    }

    const seededClassIds: string[] = [];
    for (let i = 0; i < args.classrooms; i++) {
      const classroom = await prisma.classroom.create({
        data: {
          tenantId: seededTenant.id,
          schoolId: seededSchool.id,
          name: `Lớp ${String(i + 1).padStart(2, "0")}`,
          ageGroup: `${2 + (i % 4)}-${3 + (i % 4)} tuổi`,
          homeroomTeacherId: teacherIds[i % Math.max(1, teacherIds.length)],
        },
      });
      seededClassIds.push(classroom.id);
    }

    await prisma.student.createMany({
      data: Array.from({ length: args.students }, (_, i) => ({
        tenantId: seededTenant.id,
        schoolId: seededSchool.id,
        classroomId: seededClassIds[i % seededClassIds.length],
        fullName: `Bé Demo ${String(i + 1).padStart(3, "0")}`,
        nickname: `Demo ${i + 1}`,
        dateOfBirth: dateOnly(addDays(today, -(900 + i * 7))),
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        createdById: seededAdmin.id,
      })),
    });

    if (args.storageMb && args.storageMb > 0) {
      const chunks: number[] = [];
      let remaining = args.storageMb;
      while (remaining > 0) {
        const mb = Math.min(900, remaining);
        chunks.push(mb);
        remaining -= mb;
      }
      await prisma.media.createMany({
        data: chunks.map((mb, i) => ({
          tenantId: seededTenant.id,
          schoolId: seededSchool.id,
          kind: "DOCUMENT",
          path: `${seededTenant.id}/seed-storage-${i + 1}.bin`,
          mimeType: "application/octet-stream",
          sizeBytes: mb * 1024 * 1024,
          originalName: `seed-storage-${i + 1}.bin`,
          uploadedById: seededAdmin.id,
        })),
      });
    }

    let invoiceSeq = 0;
    const invoiceNumber = (issuedAt: Date) => {
      invoiceSeq += 1;
      const y = issuedAt.getFullYear();
      const m = String(issuedAt.getMonth() + 1).padStart(2, "0");
      const d = String(issuedAt.getDate()).padStart(2, "0");
      return `${args.slug}-${planCode}-${y}${m}${d}-${String(invoiceSeq).padStart(2, "0")}`.toUpperCase();
    };

    async function createPlatformInvoice(input: {
      status: PlatformInvoiceStatus;
      issuedAt: Date;
      dueAt: Date;
      total: number;
      amountPaid?: number;
      paidAt?: Date;
    }) {
      await prisma.platformInvoice.create({
        data: {
          invoiceNumber: invoiceNumber(input.issuedAt),
          tenantId: seededTenant.id,
          subscriptionId: sub.id,
          status: input.status,
          periodStart: input.issuedAt,
          periodEnd: addDays(input.issuedAt, 30),
          subtotal: input.total,
          total: input.total,
          amountPaid: input.amountPaid ?? 0,
          issuedAt: input.issuedAt,
          dueAt: input.dueAt,
          paidAt: input.paidAt,
          lines: {
            create: {
              kind: "SUBSCRIPTION",
              label: `${planName} — ${billingCycle}`,
              quantity: 1,
              unitPrice: input.total,
              amount: input.total,
            },
          },
        },
      });
    }

    if (args.paidInvoice) {
      const issuedAt = addDays(now, -38);
      await createPlatformInvoice({
        status: PlatformInvoiceStatus.PAID,
        issuedAt,
        dueAt: addDays(issuedAt, 7),
        total: invoiceAmount,
        amountPaid: invoiceAmount,
        paidAt: addDays(issuedAt, 4),
      });
    }
    if (args.overdueInvoice) {
      const issuedAt = addDays(now, -(args.overdueInvoice.daysLate + 10));
      await createPlatformInvoice({
        status: PlatformInvoiceStatus.OPEN,
        issuedAt,
        dueAt: addDays(now, -args.overdueInvoice.daysLate),
        total: invoiceAmount,
        amountPaid: args.overdueInvoice.amountPaid ?? 0,
      });
    }

    await prisma.usageEvent.createMany({
      data: [0, 1, 3].map((daysAgo) => ({
        tenantId: seededTenant.id,
        userId: seededAdmin.id,
        type: "login",
        createdAt: addDays(now, -daysAgo),
      })),
    });

    return {
      slug: args.slug,
      name: args.legalName,
      plan: plan.name,
      students: args.students,
      classrooms: args.classrooms,
      teachers: args.teachers,
    };
  }

  const platformCases = [
    await seedPlatformCase({
      slug: "saomai",
      legalName: "Mầm non Sao Mai",
      taxCode: "0311111111",
      planCode: "free",
      students: 21,
      classrooms: 2,
      teachers: 2,
      storageMb: 980,
      paidInvoice: true,
    }),
    await seedPlatformCase({
      slug: "bupmang",
      legalName: "Mầm non Búp Măng",
      taxCode: "0311111112",
      planCode: "starter",
      students: 96,
      classrooms: 8,
      teachers: 7,
      storageMb: 4_800,
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      pastDueDays: 9,
      overdueInvoice: { daysLate: 8, amountPaid: 150_000 },
      paidInvoice: true,
    }),
    await seedPlatformCase({
      slug: "rangdong",
      legalName: "Mầm non Rạng Đông",
      taxCode: "0311111115",
      planCode: "starter",
      students: 72,
      classrooms: 5,
      teachers: 5,
      storageMb: 1_200,
      paidInvoice: true,
    }),
    await seedPlatformCase({
      slug: "tuoitho",
      legalName: "Mầm non Tuổi Thơ",
      taxCode: "0311111113",
      planCode: "pro",
      tenantStatus: TenantStatus.TRIAL,
      subscriptionStatus: SubscriptionStatus.TRIALING,
      trialEndsInDays: 2,
      students: 285,
      classrooms: 18,
      teachers: 22,
      storageMb: 18_800,
    }),
    await seedPlatformCase({
      slug: "banmai",
      legalName: "Hệ thống Mầm non Ban Mai",
      taxCode: "0311111114",
      planCode: "enterprise",
      billingCycle: BillingCycle.ANNUAL,
      billingMode: BillingMode.MANUAL,
      students: 420,
      classrooms: 28,
      teachers: 38,
      invoiceAmount: 36_000_000,
      overdueInvoice: { daysLate: 14 },
      paidInvoice: true,
    }),
  ];

  // eslint-disable-next-line no-console
  console.log(
    [
      "Seed DEMO xong:",
      `  Tenant : ${tenant.legalName} (slug=${SLUG}, host=${HOST}, gói PRO)`,
      `  Tài khoản: admin@hoasen.edu.vn / ${PASSWORD} (và hieutruong/co.mai/co.lan/yta.hoa/ketoan, ph01..ph12)`,
      `  Đăng nhập bằng SĐT: GV co.mai=0909000010, co.lan=0909000011 · PH ph01=0901000001..ph12=0901000012`,
      `  Dữ liệu 2 tháng (${HISTORY_START.toISOString().slice(0, 10)} → nay, ${schoolDays.length} ngày học): điểm danh · báo cáo (có ảnh) · đón-trả (ủy quyền + nhật ký) · sức khỏe/thuốc/sự cố · nghỉ phép`,
      `           · thực đơn ${menuWeeks.length} tuần (có cảnh báo dị ứng) · thông báo · học phí ${billingMonths.length} tháng (tháng cũ đã thu, tháng này còn nợ/1 phần) · giáo án · album`,
      "  Platform cases:",
      ...platformCases.map(
        (x) =>
          `    - ${x.name} (slug=${x.slug}, gói ${x.plan}): ${x.students} HS · ${x.classrooms} lớp · ${x.teachers} GV`,
      ),
    ].join("\n"),
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
