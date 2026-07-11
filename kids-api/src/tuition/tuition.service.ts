import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, TuitionInvoiceStatus } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { page, PaginationQuery } from "../common/http/pagination";
import { paginated } from "../common/http/api-response";
import { recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

export interface InvoiceItemInput {
  label: string;
  quantity?: number;
  unitPrice: number;
}
export interface CreateInvoiceInput {
  studentId: string;
  period: string;
  issueDate?: string; // YYYY-MM-DD (mặc định hôm nay)
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItemInput[];
  discount?: number;
  note?: string;
}

const invoiceInclude = {
  items: true,
  // Không lộ rawPayload (IPN thô)/gatewayRef/reference/recordedById cho phụ huynh xem hóa đơn.
  // Prisma 5.22 chưa bật omit → dùng select tường minh (chỉ field an toàn), bỏ 4 field nhạy cảm.
  payments: {
    where: { deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      schoolId: true,
      invoiceId: true,
      method: true,
      status: true,
      amount: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  student: { select: { id: true, fullName: true } },
};

@Injectable()
export class TuitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** Kế toán/admin tạo hóa đơn học phí cho 1 học sinh (số hóa đơn tuần tự theo năm). */
  async create(user: AuthUser, input: CreateInvoiceInput) {
    const student = await this.prisma.db.student.findFirst({
      where: { id: input.studentId, ...schoolWhere(user) },
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });
    if (!input.items.length)
      throw new BadRequestException({ code: "NO_ITEMS", message: "Hóa đơn cần ít nhất 1 khoản" });

    const items = input.items.map((it) => {
      const quantity = it.quantity ?? 1;
      return {
        label: it.label,
        quantity,
        unitPrice: it.unitPrice,
        amount: quantity * it.unitPrice,
      };
    });
    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    const discount = input.discount ?? 0;
    const total = subtotal - discount;
    if (total < 0)
      throw new BadRequestException({ code: "BAD_TOTAL", message: "Giảm giá vượt tổng tiền" });

    const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();

    const invoice = await this.prisma.db.$transaction(async (tx) => {
      const year = issueDate.getFullYear();
      const scope = `tuition:${year}`;
      const counter = await tx.invoiceCounter.upsert({
        where: { tenantId_scope: { tenantId: user.tenantId!, scope } },
        create: { tenantId: user.tenantId!, scope, nextValue: 2 },
        update: { nextValue: { increment: 1 } },
        select: { nextValue: true },
      });
      const invoiceNumber = `HD-${year}-${String(counter.nextValue - 1).padStart(4, "0")}`;

      return tx.tuitionInvoice.create({
        data: {
          tenantId: user.tenantId!,
          schoolId: student.schoolId,
          studentId: input.studentId,
          invoiceNumber,
          period: input.period,
          issueDate,
          dueDate: new Date(input.dueDate),
          subtotal,
          discount,
          total,
          note: input.note,
          createdById: user.id,
          items: {
            create: items.map((it) => ({ tenantId: user.tenantId!, ...it })), // nested → set tenantId
          },
        },
        include: invoiceInclude,
      });
    });

    await this.notifications.notifyStudentParents(user.tenantId!, input.studentId, {
      type: NotificationType.INVOICE,
      title: `Hóa đơn học phí ${invoice.invoiceNumber}`,
      body: `Kỳ ${input.period} · ${total.toLocaleString("vi-VN")}đ · hạn ${input.dueDate}`,
      linkType: "TuitionInvoice",
      linkId: invoice.id,
    });
    return invoice;
  }

  /** Danh sách hóa đơn cho staff (school-scope, lọc trạng thái/học sinh). */
  async list(
    user: AuthUser,
    opts: {
      status?: TuitionInvoiceStatus;
      studentId?: string;
      search?: string;
    } & PaginationQuery = {},
  ) {
    const pg = page(opts);
    const search = opts.search?.trim();
    const where = {
      ...schoolWhere(user),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.studentId ? { studentId: opts.studentId } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: "insensitive" as const } },
              { student: { fullName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.db.tuitionInvoice.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.tuitionInvoice.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Hóa đơn của các con phụ huynh đang đăng nhập. */
  async myInvoices(user: AuthUser, opts: PaginationQuery = {}) {
    const pg = page(opts);
    const where = { student: { parents: { some: { parentId: user.id } } } };
    const [items, total] = await Promise.all([
      this.prisma.db.tuitionInvoice.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.tuitionInvoice.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Chi tiết — staff (school-scope) hoặc phụ huynh sở hữu. */
  async get(user: AuthUser, id: string) {
    const invoice = await this.prisma.db.tuitionInvoice.findFirst({
      where: { id, ...recordScopeWhere(user) },
      include: invoiceInclude,
    });
    if (!invoice)
      throw new NotFoundException({ code: "NO_INVOICE", message: "Không tìm thấy hóa đơn" });
    return invoice;
  }

  /** Hủy hóa đơn (chỉ khi chưa có thanh toán nào thành công). */
  async cancel(user: AuthUser, id: string) {
    const invoice = await this.prisma.db.tuitionInvoice.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true, status: true, amountPaid: true },
    });
    if (!invoice)
      throw new NotFoundException({ code: "NO_INVOICE", message: "Không tìm thấy hóa đơn" });
    if (invoice.status === "PAID" || Number(invoice.amountPaid) > 0)
      throw new BadRequestException({
        code: "HAS_PAYMENT",
        message: "Hóa đơn đã có thanh toán, không thể hủy",
      });
    const canceled = await this.prisma.db.tuitionInvoice.update({
      where: { id },
      data: { status: TuitionInvoiceStatus.CANCELED },
    });
    await this.audit.logAs(user, "invoice.cancel", { type: "TuitionInvoice", id });
    return canceled;
  }

  /** Cộng dồn thanh toán vào hóa đơn → cập nhật amountPaid + trạng thái PAID/PARTIAL. */
  async applyPayment(invoiceId: string, amount: number) {
    const inv = await this.prisma.db.tuitionInvoice.findFirst({
      where: { id: invoiceId },
      select: { total: true, amountPaid: true },
    });
    if (!inv) return;
    const paid = Number(inv.amountPaid) + amount;
    const status =
      paid >= Number(inv.total) ? TuitionInvoiceStatus.PAID : TuitionInvoiceStatus.PARTIAL;
    await this.prisma.db.tuitionInvoice.update({
      where: { id: invoiceId },
      data: { amountPaid: paid, status },
    });
  }

  /** Dữ liệu cho bản in chứng từ (hóa đơn + thông tin tổ chức). */
  async printData(user: AuthUser, id: string) {
    const invoice = await this.get(user, id);
    const org = await this.prisma.system.tenantSettings.findUnique({
      where: { tenantId: user.tenantId! },
      select: {
        displayName: true,
        taxCode: true,
        invoiceAddress: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
        supportEmail: true,
      },
    });
    return { invoice, org: org ?? { displayName: "Trường" } };
  }

  /** Xuất CSV hóa đơn (school-scope) cho phần mềm kế toán / quyết toán thuế. */
  async exportCsv(user: AuthUser, opts: { status?: TuitionInvoiceStatus } = {}): Promise<string> {
    const rows = await this.prisma.db.tuitionInvoice.findMany({
      where: { ...schoolWhere(user), ...(opts.status ? { status: opts.status } : {}) },
      include: { student: { select: { fullName: true } } },
      orderBy: { issueDate: "asc" },
    });
    const header = [
      "So hoa don",
      "Ky",
      "Hoc sinh",
      "Ngay lap",
      "Han TT",
      "Tam tinh",
      "Giam gia",
      "Tong cong",
      "Da thanh toan",
      "Trang thai",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const d = (x: Date) => new Date(x).toISOString().slice(0, 10);
    const lines = rows.map((r) =>
      [
        r.invoiceNumber,
        r.period,
        r.student.fullName,
        d(r.issueDate),
        d(r.dueDate),
        r.subtotal,
        r.discount,
        r.total,
        r.amountPaid,
        r.status,
      ]
        .map(esc)
        .join(","),
    );
    return "﻿" + [header.map(esc).join(","), ...lines].join("\r\n"); // BOM cho Excel
  }

  /** Cron: đánh dấu OVERDUE các hóa đơn quá hạn chưa trả đủ. */
  async markOverdue(now = new Date()) {
    const res = await this.prisma.system.tuitionInvoice.updateMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: now } },
      data: { status: TuitionInvoiceStatus.OVERDUE },
    });
    return res.count;
  }
}
