import { Injectable } from '@nestjs/common';

import type { CreateDailyReportRequest, DailyReportDTO, Paginated } from '@kimthanh/shared-types';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForStudent(
    studentId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<DailyReportDTO>> {
    const where = { studentId };
    const [items, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        include: { media: { select: { mediaId: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: 'desc' },
      }),
      this.prisma.dailyReport.count({ where }),
    ]);
    return {
      items: items.map((r) => this.toDTO(r)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async create(authorId: string, dto: CreateDailyReportRequest): Promise<DailyReportDTO> {
    const row = await this.prisma.dailyReport.create({
      data: {
        studentId: dto.studentId,
        classroomId: dto.classroomId,
        date: new Date(dto.date),
        mood: dto.mood,
        meals: dto.meals,
        nap: dto.nap,
        activities: dto.activities,
        note: dto.note,
        authorId,
        media: dto.mediaIds
          ? { create: dto.mediaIds.map((mediaId) => ({ mediaId })) }
          : undefined,
      },
      include: { media: { select: { mediaId: true } } },
    });
    return this.toDTO(row);
  }

  private toDTO(r: {
    id: string;
    studentId: string;
    classroomId: string;
    date: Date;
    mood: string | null;
    meals: string | null;
    nap: string | null;
    activities: string | null;
    note: string | null;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    media: { mediaId: string }[];
  }): DailyReportDTO {
    return {
      id: r.id,
      studentId: r.studentId,
      classroomId: r.classroomId,
      date: r.date.toISOString().slice(0, 10),
      mood: r.mood,
      meals: r.meals,
      nap: r.nap,
      activities: r.activities,
      note: r.note,
      authorId: r.authorId,
      mediaIds: r.media.map((m) => m.mediaId),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
