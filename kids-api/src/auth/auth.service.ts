import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PlatformRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { TenantContextStore } from "../common/context/tenant-context";
import { comparePassword, hashPassword, needsRehash } from "../common/crypto/password";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsageService } from "../usage/usage.service";
import { TokenService } from "./token.service";
import { UserContextService } from "./user-context.service";

const DUMMY_PASSWORD_HASH = "$2b$12$X0wx9P0xn0XCjrzR2x5UJu3Xwd4fEpu3cEFZYqcOieya22tenzv52";

export interface LoginInput {
  identifier?: string;
  email?: string;
  password: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly users: UserContextService,
    private readonly usage: UsageService,
    private readonly env: EnvService,
  ) {}

  /** Đăng nhập theo ngữ cảnh host: platform host → platform user; tenant host → user của tenant đó. */
  async login(
    input: LoginInput,
    meta: { userAgent?: string; ip?: string },
  ): Promise<AuthTokens & { userId: string }> {
    const ctx = TenantContextStore.get();
    const id = input.identifier ?? input.email ?? "";
    // Định danh có thể là email hoặc số điện thoại.
    const idMatch = { OR: [{ email: id }, { phone: id }] };
    const scope = ctx?.platformScope
      ? { type: "PLATFORM" as const, tenantId: null }
      : ctx?.tenantId
        ? { type: "TENANT" as const, tenantId: ctx.tenantId }
        : null;

    if (!scope) {
      throw new UnauthorizedException({
        code: "TENANT_REQUIRED",
        message: "Không xác định được trường (tenant). Hãy đăng nhập qua đúng tên miền của trường.",
      });
    }

    const user = await this.prisma.system.user.findFirst({
      where: { ...scope, ...idMatch, isActive: true, deletedAt: null },
    });
    // Không tồn tại → vẫn chạy bcrypt với dummy hash để giảm account enumeration qua timing.
    if (!user) {
      await comparePassword(input.password, DUMMY_PASSWORD_HASH);
      throw this.invalidCredentials();
    }

    // Account lockout: đang trong thời gian khóa → chặn ngay cả khi mật khẩu đúng.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({
        code: "ACCOUNT_LOCKED",
        message: "Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ít phút.",
      });
    }

    const ok = await comparePassword(input.password, user.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!ok) {
      await this.registerFailedLogin(user.id);
      throw this.invalidCredentials();
    }

    // Thành công: reset bộ đếm + rehash nếu hash đang dùng cost thấp hơn cấu hình.
    const patch: { failedLoginCount?: number; lockedUntil?: null; passwordHash?: string } = {};
    if (user.failedLoginCount !== 0) patch.failedLoginCount = 0;
    if (user.lockedUntil) patch.lockedUntil = null;
    if (user.passwordHash && needsRehash(user.passwordHash))
      patch.passwordHash = await hashPassword(input.password);
    if (Object.keys(patch).length)
      await this.prisma.system.user.update({ where: { id: user.id }, data: patch });

    // Track đăng nhập (DAU/MAU). Best-effort — không để lỗi telemetry chặn đăng nhập.
    await this.usage
      .track("login", { tenantId: user.tenantId, userId: user.id, meta: { type: user.type } })
      .catch(() => undefined);

    return {
      ...(await this.issueTokens(
        user.id,
        user.type,
        user.tenantId,
        user.platformRole,
        user.tokenVersion,
        meta,
      )),
      userId: user.id,
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: "INVALID_CREDENTIALS",
      message: "Email/số điện thoại hoặc mật khẩu không đúng",
    });
  }

  /** Tăng bộ đếm đăng nhập sai; đạt ngưỡng → khóa tạm theo cấu hình. */
  private async registerFailedLogin(userId: string): Promise<void> {
    const threshold = this.env.get("AUTH_LOCKOUT_THRESHOLD");
    const user = await this.prisma.system.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (user.failedLoginCount >= threshold) {
      const until = new Date(Date.now() + this.env.get("AUTH_LOCKOUT_MINUTES") * 60_000);
      await this.prisma.system.user.update({
        where: { id: userId },
        data: { failedLoginCount: 0, lockedUntil: until },
      });
    }
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<AuthTokens> {
    const hash = this.tokens.hashRefresh(refreshToken);
    const stored = await this.prisma.system.refreshToken.findUnique({ where: { tokenHash: hash } });
    const invalid = new UnauthorizedException({
      code: "INVALID_REFRESH",
      message: "Refresh token không hợp lệ",
    });
    if (!stored || stored.expiresAt < new Date()) throw invalid;
    // Reuse-detection: token ĐÃ revoke bị dùng lại (khả năng bị đánh cắp) → thu hồi cả họ token,
    // buộc mọi phiên trong họ đăng nhập lại.
    if (stored.revokedAt) {
      if (stored.familyId) {
        await this.prisma.system.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw invalid;
    }
    const user = await this.prisma.system.user.findFirst({
      where: { id: stored.userId, isActive: true, deletedAt: null },
    });
    if (!user)
      throw new UnauthorizedException({
        code: "USER_INACTIVE",
        message: "Tài khoản không khả dụng",
      });

    // Rotate atomically: chỉ request đầu tiên được claim token cũ; request song song còn lại
    // bị coi như reuse và revoke cả family.
    const familyId = stored.familyId ?? stored.id;
    const next = this.tokens.generateRefreshToken();
    const rotated = await this.prisma.system.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) return false;
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: next.hash,
          familyId,
          userAgent: meta.userAgent,
          ipAddress: meta.ip,
          expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs()),
        },
      });
      return true;
    });
    if (!rotated) {
      await this.revokeRefreshFamily(familyId);
      throw invalid;
    }
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      type: user.type,
      tenantId: user.tenantId,
      platformRole: user.platformRole,
      tv: user.tokenVersion,
    });
    return { accessToken, refreshToken: next.token };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.tokens.hashRefresh(refreshToken);
    await this.prisma.system.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    return this.users.load(userId);
  }

  private async revokeRefreshFamily(familyId: string): Promise<void> {
    await this.prisma.system.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: string,
    type: "PLATFORM" | "TENANT",
    tenantId: string | null,
    platformRole: PlatformRole | null,
    tokenVersion: number,
    meta: { userAgent?: string; ip?: string },
    familyId?: string,
  ): Promise<AuthTokens> {
    const accessToken = await this.tokens.signAccess({
      sub: userId,
      type,
      tenantId,
      platformRole,
      tv: tokenVersion,
    });
    const { token: refreshToken, hash } = this.tokens.generateRefreshToken();
    await this.prisma.system.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        familyId: familyId ?? randomUUID(),
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs()),
      },
    });
    return { accessToken, refreshToken };
  }
}
