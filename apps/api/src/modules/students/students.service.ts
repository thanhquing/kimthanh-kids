import { Injectable, NotFoundException } from '@nestjs/common';

import { UserRole, type Paginated, type StudentDTO } from '@kimthanh/shared-types';

import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    actor: RequestUser,
    args: { page: number; pageSize: number; classroomId?: string },
  ): Promise<Paginated<StudentDTO>> {
    const where = await this.scopeForActor(actor, args.classroomId);
    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { parents: { select: { parentId: true } } },
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);
    return {
      items: items.map((s) => this.toDTO(s)),
      meta: {
        page: args.page,
        pageSize: args.pageSize,
        total,
        totalPages: Math.ceil(total / args.pageSize),
      },
    };
  }

  async findById(actor: RequestUser, id: string): Promise<StudentDTO> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { parents: { select: { parentId: true } } },
    });
    if (!student || student.deletedAt) {
      throw new NotFoundException({
        code: 'STUDENT_NOT_FOUND',
        messageKey: 'errors.notFound',
      });
    }
    if (actor.role === UserRole.PARENT) {
      const isParent = student.parents.some((p) => p.parentId === actor.sub);
      if (!isParent) {
        throw new NotFoundException({
          code: 'STUDENT_NOT_FOUND',
          messageKey: 'errors.notFound',
        });
      }
    }
    return this.toDTO(student);
  }

  private async scopeForActor(actor: RequestUser, classroomId?: string) {
    const base: Record<string, unknown> = { deletedAt: null };
    if (classroomId) base.classroomId = classroomId;
    if (actor.role === UserRole.PARENT) {
      base.parents = { some: { parentId: actor.sub } };
    } else if (actor.schoolId) {
      base.schoolId = actor.schoolId;
    }
    return base;
  }

  private toDTO(student: {
    id: string;
    schoolId: string;
    classroomId: string | null;
    fullName: string;
    nickname: string | null;
    dateOfBirth: Date;
    gender: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    parents: { parentId: string }[];
  }): StudentDTO {
    return {
      id: student.id,
      schoolId: student.schoolId,
      classroomId: student.classroomId,
      fullName: student.fullName,
      nickname: student.nickname,
      dateOfBirth: student.dateOfBirth.toISOString().slice(0, 10),
      gender: student.gender as StudentDTO['gender'],
      avatarUrl: student.avatarUrl,
      parentIds: student.parents.map((p) => p.parentId),
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }
}
