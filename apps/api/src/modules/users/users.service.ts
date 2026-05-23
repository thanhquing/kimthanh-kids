import { Injectable, NotFoundException } from '@nestjs/common';

import type { Paginated, UpdateUserRequest, UserDTO } from '@kimthanh/shared-types';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMe(userId: string, data: UpdateUserRequest): Promise<UserDTO> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        locale: data.locale,
      },
    });
    return this.toDTO(user);
  }

  async list(page: number, pageSize: number): Promise<Paginated<UserDTO>> {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return {
      items: items.map((u) => this.toDTO(u)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findById(id: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', messageKey: 'errors.notFound' });
    return this.toDTO(user);
  }

  private toDTO(user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    status: string;
    schoolId: string | null;
    locale: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserDTO {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role as UserDTO['role'],
      status: user.status as UserDTO['status'],
      schoolId: user.schoolId,
      locale: user.locale as UserDTO['locale'],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
