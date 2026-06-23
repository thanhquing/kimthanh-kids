import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { TenantContextStore } from "../common/context/tenant-context";
import { PrismaService } from "../prisma/prisma.service";
import { UsageService } from "../usage/usage.service";
import { TokenService } from "./token.service";
import { UserContextService } from "./user-context.service";

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
    if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Email/số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Track đăng nhập (DAU/MAU). Best-effort — không để lỗi telemetry chặn đăng nhập.
    await this.usage
      .track("login", { tenantId: user.tenantId, userId: user.id, meta: { type: user.type } })
      .catch(() => undefined);

    return {
      ...(await this.issueTokens(user.id, user.type, user.tenantId, user.platformRole, meta)),
      userId: user.id,
    };
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<AuthTokens> {
    const hash = this.tokens.hashRefresh(refreshToken);
    const stored = await this.prisma.system.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH",
        message: "Refresh token không hợp lệ",
      });
    }
    const user = await this.prisma.system.user.findFirst({
      where: { id: stored.userId, isActive: true, deletedAt: null },
    });
    if (!user)
      throw new UnauthorizedException({
        code: "USER_INACTIVE",
        message: "Tài khoản không khả dụng",
      });

    // Rotate: thu hồi token cũ, cấp token mới.
    await this.prisma.system.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user.id, user.type, user.tenantId, user.platformRole, meta);
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

  private async issueTokens(
    userId: string,
    type: "PLATFORM" | "TENANT",
    tenantId: string | null,
    platformRole: import("@prisma/client").PlatformRole | null,
    meta: { userAgent?: string; ip?: string },
  ): Promise<AuthTokens> {
    const accessToken = await this.tokens.signAccess({ sub: userId, type, tenantId, platformRole });
    const { token: refreshToken, hash } = this.tokens.generateRefreshToken();
    await this.prisma.system.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs()),
      },
    });
    return { accessToken, refreshToken };
  }
}
