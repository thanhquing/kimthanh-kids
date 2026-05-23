import { Injectable } from '@nestjs/common';

import type { AttendanceDTO, MarkAttendanceRequest } from '@kimthanh/shared-types';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(classroomId: string, date: string): Promise<AttendanceDTO[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { classroomId, date: new Date(date) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((a) => this.toDTO(a));
  }

  async mark(recordedById: string, dto: MarkAttendanceRequest): Promise<AttendanceDTO> {
    const row = await this.prisma.attendance.upsert({
      where: { studentId_date: { studentId: dto.studentId, date: new Date(dto.date) } },
      create: {
        studentId: dto.studentId,
        classroomId: dto.classroomId,
        date: new Date(dto.date),
        status: dto.status,
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        note: dto.note,
        recordedById,
      },
      update: {
        status: dto.status,
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        note: dto.note,
        recordedById,
      },
    });
    return this.toDTO(row);
  }

  private toDTO(a: {
    id: string;
    studentId: string;
    classroomId: string;
    date: Date;
    status: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    note: string | null;
    recordedById: string;
    createdAt: Date;
    updatedAt: Date;
  }): AttendanceDTO {
    return {
      id: a.id,
      studentId: a.studentId,
      classroomId: a.classroomId,
      date: a.date.toISOString().slice(0, 10),
      status: a.status as AttendanceDTO['status'],
      checkInAt: a.checkInAt?.toISOString() ?? null,
      checkOutAt: a.checkOutAt?.toISOString() ?? null,
      note: a.note,
      recordedById: a.recordedById,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
