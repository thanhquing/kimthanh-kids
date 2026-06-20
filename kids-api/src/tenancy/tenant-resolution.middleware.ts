import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { TenantContext, TenantContextStore } from "../common/context/tenant-context";
import { EnvService } from "../config/env.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Resolve tenant từ Host header (subdomain / custom domain), fallback JWT (do guard xử lý).
 * Set ALS context bao trùm toàn bộ request. SILO: luôn dùng FIXED_TENANT_ID.
 *
 * Thứ tự: SILO env → PLATFORM_HOST → API_HOST (fallback JWT) → tra TenantDomain → undefined.
 * Việc khớp jwt.tenantId vs host.tenantId + chặn 404 do TenantGuard đảm nhiệm (cần user).
 */
@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const ctx: TenantContext = {};
    const host = (req.headers.host ?? "").split(":")[0].toLowerCase();

    if (this.env.get("TENANCY_MODE") === "SILO") {
      const fixed = this.env.get("FIXED_TENANT_ID");
      if (fixed) ctx.tenantId = fixed;
    } else if (host === this.env.get("PLATFORM_HOST")) {
      ctx.platformScope = true; // xác nhận lại bằng user role ở JwtAuthGuard
    } else if (host && host !== this.env.get("API_HOST")) {
      const domain = await this.prisma.system.tenantDomain.findFirst({
        where: { host, status: "ACTIVE" },
        select: { tenantId: true },
      });
      if (domain) ctx.tenantId = domain.tenantId;
    }
    // host === API_HOST hoặc không khớp (vd localhost): để trống → JWT fallback ở guard.

    // Lưu host để TenantGuard so khớp.
    (req as Request & { resolvedHost?: string }).resolvedHost = host;

    TenantContextStore.run(ctx, () => next());
  }
}
