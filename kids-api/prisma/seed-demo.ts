/**
 * Seed dữ liệu DEMO: 1 trường mầm non đầy đủ (gói PRO — bật mọi tính năng) để dev UI
 * có dữ liệu thật chạy thử. Idempotent: xoá sạch dữ liệu của tenant slug "demo" rồi tạo lại
 * (chỉ chạm đúng tenant này — an toàn). Chạy SAU prisma:seed (cần các gói đã tồn tại).
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
  Gender,
  IncidentSeverity,
  LeaveStatus,
  LeaveType,
  MealType,
  MedicineStatus,
  Mood,
  NotificationType,
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

  const now = new Date();
  const today = dateOnly(now);
  const periodEnd = addDays(now, 100 * 365);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Tenant + settings + domain + subscription (gói PRO) + school ───
  const tenant = await prisma.tenant.create({
    data: {
      slug: SLUG,
      legalName: "Mầm non Hoa Sen",
      status: TenantStatus.ACTIVE,
      planTier: proPlan.tier,
      currentPeriodEnd: periodEnd,
      settings: {
        create: {
          displayName: "Mầm non Hoa Sen",
          primaryColor: "#16a34a",
          secondaryColor: "#f59e0b",
          supportEmail: "lienhe@hoasen.edu.vn",
          taxCode: "0312345678",
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

  await prisma.subscription.create({
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
  await createStaff("hieutruong@hoasen.edu.vn", "Lê Thị Hiệu", TenantRole.PRINCIPAL);
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

  // ─── Vài usage event (login) rải vài ngày để overview có DAU/WAU ───
  await prisma.usageEvent.createMany({
    data: [0, 0, 1, 2, 6].map((daysAgo, i) => ({
      tenantId,
      userId: i % 2 === 0 ? admin.id : coMai.id,
      type: "login",
      createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
    })),
  });

  // eslint-disable-next-line no-console
  console.log(
    [
      "Seed DEMO xong:",
      `  Tenant : ${tenant.legalName} (slug=${SLUG}, host=${HOST}, gói PRO)`,
      `  Tài khoản: admin@hoasen.edu.vn / ${PASSWORD} (và hieutruong/co.mai/co.lan/yta.hoa/ketoan, ph01..ph12)`,
      `  Dữ liệu: 3 lớp · ${kids.length} học sinh+PH · điểm danh hôm nay · báo cáo · sức khỏe/thuốc/sự cố · nghỉ phép`,
      "           · thực đơn tuần (có cảnh báo dị ứng) · 2 thông báo · 12 hóa đơn (1 đã trả, 1 trả 1 phần) · giáo án · album",
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
