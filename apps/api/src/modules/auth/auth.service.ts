import * as crypto from 'crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { User as PrismaUser } from '@prisma/client';

import { UserRole, type AuthTokens, type JwtPayload, type LoginResponse, type UserDTO } from '@kimthanh/shared-types';

import { PrismaService } from '../prisma/prisma.service';

import type { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'Email already in use',
        messageKey: 'errors.auth.emailExists',
      });
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role ?? UserRole.PARENT,
      },
    });
    const tokens = await this.issueTokens(user);
    return { user: this.toUserDTO(user), tokens };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) throw this.invalidCredentials();
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw this.invalidCredentials();
    const tokens = await this.issueTokens(user);
    return { user: this.toUserDTO(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret });
    } catch {
      throw this.invalidCredentials();
    }
    const hash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw this.invalidCredentials();
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toUserDTO(user);
  }

  private async issueTokens(user: PrismaUser): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      schoolId: user.schoolId ?? undefined,
    };
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '30d');

    const accessToken = await this.jwt.signAsync(payload, { expiresIn: accessTtl });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTtl,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.parseTtlMs(refreshTtl)),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(this.parseTtlMs(accessTtl) / 1000),
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      messageKey: 'errors.auth.invalidCredentials',
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return Number(ttl) || 0;
    const [, n, unit] = match;
    const value = Number(n);
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60_000;
      case 'h': return value * 3_600_000;
      case 'd': return value * 86_400_000;
      default: return value;
    }
  }

  private toUserDTO(user: PrismaUser): UserDTO {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role as UserRole,
      status: user.status as UserDTO['status'],
      schoolId: user.schoolId,
      locale: user.locale as UserDTO['locale'],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
