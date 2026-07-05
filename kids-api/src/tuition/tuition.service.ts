import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, TuitionInvoiceStatus } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
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
    const invoiceNumber = await this.nextInvoiceNumber(issueDate.getFullYear());

    const invoice = await this.prisma.db.tuitionInvoice.create({
      data: {
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
      } as never,
      include: invoiceInclude,
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

  private async nextInvoiceNumber(year: number): Promise<string> {
    const count = await this.prisma.db.tuitionInvoice.count({
      where: { invoiceNumber: { startsWith: `HD-${year}-` } },
    });
    return `HD-${year}-${(count + 1).toString().padStart(4, "0")}`;
  }

  /** Danh sách hóa đơn cho staff (school-scope, lọc trạng thái/học sinh). */
  list(user: AuthUser, opts: { status?: TuitionInvoiceStatus; studentId?: string } = {}) {
    return this.prisma.db.tuitionInvoice.findMany({
      where: {
        ...schoolWhere(user),
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.studentId ? { studentId: opts.studentId } : {}),
      },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Hóa đơn của các con phụ huynh đang đăng nhập. */
  myInvoices(user: AuthUser) {
    return this.prisma.db.tuitionInvoice.findMany({
      where: { student: { parents: { some: { parentId: user.id } } } },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
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
