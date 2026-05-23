import { Injectable } from '@nestjs/common';

import {
  PaymentStatus,
  UserRole,
  type Paginated,
  type TuitionInvoiceDTO,
} from '@kimthanh/shared-types';

import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices(
    actor: RequestUser,
    args: { page: number; pageSize: number; studentId?: string; status?: PaymentStatus },
  ): Promise<Paginated<TuitionInvoiceDTO>> {
    const where: Record<string, unknown> = {};
    if (args.studentId) where.studentId = args.studentId;
    if (args.status) where.status = args.status;

    if (actor.role === UserRole.PARENT) {
      where.student = { parents: { some: { parentId: actor.sub } } };
    } else if (actor.schoolId) {
      where.schoolId = actor.schoolId;
    }

    const [items, total] = await Promise.all([
      this.prisma.tuitionInvoice.findMany({
        where,
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
        orderBy: { dueDate: 'desc' },
      }),
      this.prisma.tuitionInvoice.count({ where }),
    ]);
    return {
      items: items.map((i) => this.toDTO(i)),
      meta: {
        page: args.page,
        pageSize: args.pageSize,
        total,
        totalPages: Math.ceil(total / args.pageSize),
      },
    };
  }

  private toDTO(i: {
    id: string;
    schoolId: string;
    studentId: string;
    period: string;
    amount: { toString: () => string };
    currency: string;
    dueDate: Date;
    status: string;
    paidAt: Date | null;
    paymentMethod: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TuitionInvoiceDTO {
    return {
      id: i.id,
      schoolId: i.schoolId,
      studentId: i.studentId,
      period: i.period,
      amount: Number(i.amount.toString()),
      currency: i.currency,
      dueDate: i.dueDate.toISOString().slice(0, 10),
      status: i.status as TuitionInvoiceDTO['status'],
      paidAt: i.paidAt?.toISOString() ?? null,
      paymentMethod: i.paymentMethod,
      note: i.note,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }
}
