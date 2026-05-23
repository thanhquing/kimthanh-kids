import { Injectable } from '@nestjs/common';

import type { ClassroomDTO } from '@kimthanh/shared-types';

import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: RequestUser): Promise<ClassroomDTO[]> {
    const rows = await this.prisma.classroom.findMany({
      where: { schoolId: actor.schoolId ?? undefined, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      name: c.name,
      ageGroup: c.ageGroup,
      capacity: c.capacity,
      homeroomTeacherId: c.homeroomTeacherId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }
}
