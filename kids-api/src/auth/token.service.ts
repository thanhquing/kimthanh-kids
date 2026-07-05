import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PlatformRole, UserType } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { EnvService } from "../config/env.service";

export interface AccessTokenPayload {
  sub: string;
  type: UserType;
  tenantId: string | null;
  platformRole: PlatformRole | null;
  /** tokenVersion của user tại thời điểm cấp; lệch với DB → token bị vô hiệu (reset mật khẩu). */
  tv: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly env: EnvService,
  ) {}

  async signAccess(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.env.get("JWT_ACCESS_SECRET"),
      expiresIn: this.env.get("JWT_ACCESS_TTL"),
      algorithm: "HS256",
    });
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    // Pin thuật toán: chỉ chấp nhận HS256 → chặn algorithm-confusion (vd token `alg:none`).
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.env.get("JWT_ACCESS_SECRET"),
      algorithms: ["HS256"],
    });
  }

  /** Refresh token là chuỗi ngẫu nhiên (không phải JWT); lưu hash SHA-256 trong DB. */
  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString("base64url");
    return { token, hash: this.hashRefresh(token) };
  }

  hashRefresh(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  refreshTtlMs(): number {
    const ttl = this.env.get("JWT_REFRESH_TTL"); // vd "30d"
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return 30 * 24 * 60 * 60 * 1000;
    const n = Number(m[1]);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]] ?? 86_400_000;
    return n * unit;
  }
}
