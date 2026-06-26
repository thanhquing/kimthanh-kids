/**
 * Seed dữ liệu DEMO: 1 trường mầm non đầy đủ (gói PRO — bật mọi tính năng) + vài tenant
 * platform case (quota gần đầy, trial sắp hết hạn, công nợ, đủ gói) để dev UI có dữ liệu
 * thật chạy thử. Idempotent: xoá sạch dữ liệu của các slug demo rồi tạo lại
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
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Tenant + settings + domain + subscription (gói PRO) + school ───
  const tenant = await prisma.tenant.create({
    data: {
      slug: SLUG,
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
  const admin = await createStaff("admin@hoasen.edu.vn", "Trần Quản Trị", TenantRole.SCHOOL_ADMIN);
  const hieuTruong = await createStaff(
    "hieutruong@hoasen.edu.vn",
    "Lê Thị Hiệu",
    TenantRole.PRINCIPAL,
  );
  const coMai = await createStaff("co.mai@hoasen.edu.vn", "Nguyễn Thị Mai", TenantRole.TEACHER);
  const coLan = await createStaff("co.lan@hoasen.edu.vn", "Phạm Thị Lan", TenantRole.TEACHER);
  const nurse = await createStaff("yta.hoa@hoasen.edu.vn", "Đỗ Thị Hoa", TenantRole.NURSE);
  await createStaff("ketoan@hoasen.edu.vn", "Vũ Kế Toán", TenantRole.FINANCE);

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

  // ─── Điểm danh hôm nay (đa số có mặt, 1 vắng, 1 muộn) ───
  await prisma.attendance.createMany({
    data: kids.map((k, i) => ({
      tenantId,
      schoolId,
      studentId: k.id,
      classroomId: k.classroomId,
      date: today,
      status:
        i === 3
          ? AttendanceStatus.ABSENT
          : i === 5
            ? AttendanceStatus.LATE
            : AttendanceStatus.PRESENT,
      checkInAt: i === 3 ? null : new Date(now.getTime()),
    })),
  });

  // ─── Báo cáo hằng ngày (lớp Mầm) ───
  const moods = [Mood.HAPPY, Mood.NEUTRAL, Mood.TIRED, Mood.HAPPY];
  await prisma.dailyReport.createMany({
    data: kids
      .filter((k) => k.classroomId === clsMam.id)
      .map((k, i) => ({
        tenantId,
        schoolId,
        studentId: k.id,
        classroomId: clsMam.id,
        date: today,
        mood: moods[i % moods.length],
        meals: "Ăn hết suất",
        nap: "Ngủ ngon 90 phút",
        activities: "Vẽ tranh, hát, chơi ngoài trời",
        authorId: coMai.id,
      })),
  });

  // ─── Sức khỏe: chỉ số tăng trưởng + dị ứng + thuốc + sự cố ───
  for (const k of kids.slice(0, 4)) {
    await prisma.healthRecord.createMany({
      data: [
        {
          tenantId,
          schoolId,
          studentId: k.id,
          date: dateOnly(addDays(today, -60)),
          heightCm: 92 + Math.random() * 6,
          weightKg: 13 + Math.random() * 2,
          recordedById: nurse.id,
        },
        {
          tenantId,
          schoolId,
          studentId: k.id,
          date: today,
          heightCm: 94 + Math.random() * 6,
          weightKg: 14 + Math.random() * 2,
          recordedById: nurse.id,
        },
      ],
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

  // ─── Thực đơn tuần (T2–T6), có món chứa đậu phộng để minh hoạ cảnh báo dị ứng ───
  const weekStart = mondayOf(now);
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
            name: "Cơm gà, canh rau ngót",
            ingredients: "gà, gạo, rau ngót",
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

  // ─── Học phí: mỗi bé 1 hoá đơn kỳ này; 1 đã trả (CASH), 1 trả một phần, còn lại chưa trả ───
  const year = today.getUTCFullYear();
  let seq = 0;
  for (const k of kids) {
    seq += 1;
    const tuition = 2_000_000;
    const meal = 770_000; // 22 buổi x 35k
    const discount = seq === 1 ? 100_000 : 0;
    const subtotal = tuition + meal;
    const total = subtotal - discount;
    const invoiceNumber = `HD-${year}-${String(seq).padStart(4, "0")}`;
    const isPaid = seq === 2;
    const isPartial = seq === 3;
    const amountPaid = isPaid ? total : isPartial ? 1_000_000 : 0;
    const status = isPaid
      ? TuitionInvoiceStatus.PAID
      : isPartial
        ? TuitionInvoiceStatus.PARTIAL
        : TuitionInvoiceStatus.UNPAID;

    const invoice = await prisma.tuitionInvoice.create({
      data: {
        tenantId,
        schoolId,
        studentId: k.id,
        invoiceNumber,
        period: `${year}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`,
        issueDate: today,
        dueDate: addDays(today, 10),
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
          paidAt: now,
          recordedById: admin.id,
        },
      });
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

  // ─── Album ảnh (PRO) — 1 media placeholder + 1 ảnh ───
  const media = await prisma.media.create({
    data: {
      tenantId,
      schoolId,
      kind: "ALBUM",
      path: `${tenantId}/demo-photo.webp`,
      mimeType: "image/webp",
      sizeBytes: 102_400,
      width: 1280,
      height: 853,
      originalName: "da-ngoai.webp",
      uploadedById: coMai.id,
    },
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
        title: `Hóa đơn học phí HD-${year}-0001`,
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
      `  Dữ liệu: 3 lớp · ${kids.length} học sinh+PH · điểm danh hôm nay · báo cáo · sức khỏe/thuốc/sự cố · nghỉ phép`,
      "           · thực đơn tuần (có cảnh báo dị ứng) · 2 thông báo · 12 hóa đơn (1 đã trả, 1 trả 1 phần) · giáo án · album",
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
