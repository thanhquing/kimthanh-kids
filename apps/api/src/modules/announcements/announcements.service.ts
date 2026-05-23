import { BadRequestException, Injectable } from '@nestjs/common';

import type {
  AnnouncementDTO,
  CreateAnnouncementRequest,
  Paginated,
} from '@kimthanh/shared-types';

import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: RequestUser, page: number, pageSize: number): Promise<Paginated<AnnouncementDTO>> {
    const where = actor.schoolId ? { schoolId: actor.schoolId } : {};
    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return {
      items: items.map((a) => this.toDTO(a)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async create(actor: RequestUser, dto: CreateAnnouncementRequest): Promise<AnnouncementDTO> {
    if (!actor.schoolId) {
      throw new BadRequestException({ code: 'NO_SCHOOL_CONTEXT', messageKey: 'errors.validation' });
    }
    const row = await this.prisma.announcement.create({
      data: {
        schoolId: actor.schoolId,
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        classroomId: dto.classroomId,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
        authorId: actor.sub,
      },
    });
    return this.toDTO(row);
  }

  private toDTO(a: {
    id: string;
    schoolId: string;
    title: string;
    body: string;
    audience: string;
    classroomId: string | null;
    publishedAt: Date | null;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
  }): AnnouncementDTO {
    return {
      id: a.id,
      schoolId: a.schoolId,
      title: a.title,
      body: a.body,
      audience: a.audience as AnnouncementDTO['audience'],
      classroomId: a.classroomId,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      authorId: a.authorId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
