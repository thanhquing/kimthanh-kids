import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AuthUser } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { TenantContextStore } from "../context/tenant-context";

/**
 * Đảm bảo ranh giới tenant nhất quán:
 * - User PLATFORM: bỏ qua (xuyên tenant).
 * - User TENANT: phải có tenantId; nếu host cũng resolve ra tenant thì PHẢI khớp jwt.tenantId
 *   (chống dùng token tenant A qua host tenant B).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user || user.type === "PLATFORM") return true;

    if (!user.tenantId) {
      throw new ForbiddenException({ code: "NO_TENANT", message: "User không thuộc tenant nào" });
    }

    const ctx = TenantContextStore.get();
    // Nếu host đã resolve tenant (ctx.tenantId từ middleware) → phải trùng tenant của user.
    if (ctx?.tenantId && ctx.tenantId !== user.tenantId) {
      throw new ForbiddenException({
        code: "TENANT_MISMATCH",
        message: "Token không thuộc tenant của domain này",
      });
    }
    return true;
  }
}
