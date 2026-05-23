import { Injectable } from '@nestjs/common';

import {
  MedicineRequestStatus,
  type CreateMedicineRequestPayload,
  type MedicineRequestDTO,
  type Paginated,
} from '@kimthanh/shared-types';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async listMedicineRequests(args: {
    page: number;
    pageSize: number;
    studentId?: string;
    status?: MedicineRequestStatus;
  }): Promise<Paginated<MedicineRequestDTO>> {
    const where = {
      ...(args.studentId ? { studentId: args.studentId } : {}),
      ...(args.status ? { status: args.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.medicineRequest.findMany({
        where,
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.medicineRequest.count({ where }),
    ]);
    return {
      items: items.map((m) => this.toDTO(m)),
      meta: {
        page: args.page,
        pageSize: args.pageSize,
        total,
        totalPages: Math.ceil(total / args.pageSize),
      },
    };
  }

  async createMedicineRequest(
    requestedById: string,
    dto: CreateMedicineRequestPayload,
  ): Promise<MedicineRequestDTO> {
    const row = await this.prisma.medicineRequest.create({
      data: {
        studentId: dto.studentId,
        requestedById,
        medicineName: dto.medicineName,
        dosage: dto.dosage,
        schedule: dto.schedule,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
    return this.toDTO(row);
  }

  private toDTO(m: {
    id: string;
    studentId: string;
    requestedById: string;
    medicineName: string;
    dosage: string;
    schedule: string;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: string;
    handledById: string | null;
    handledAt: Date | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MedicineRequestDTO {
    return {
      id: m.id,
      studentId: m.studentId,
      requestedById: m.requestedById,
      medicineName: m.medicineName,
      dosage: m.dosage,
      schedule: m.schedule,
      startDate: m.startDate.toISOString().slice(0, 10),
      endDate: m.endDate.toISOString().slice(0, 10),
      reason: m.reason,
      status: m.status as MedicineRequestDTO['status'],
      handledById: m.handledById,
      handledAt: m.handledAt?.toISOString() ?? null,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}
