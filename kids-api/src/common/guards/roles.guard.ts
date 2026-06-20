import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PlatformRole, TenantRole } from "@prisma/client";
import { Request } from "express";
import { AuthUser } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PLATFORM_ROLES_KEY, TENANT_ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Kiểm tra role:
 * - @PlatformRoles(...) → user phải là PLATFORM với platformRole phù hợp.
 * - @Roles(...) → user TENANT có ít nhất 1 role khớp.
 * - Không có decorator → cho qua (chỉ cần đã xác thực).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const handlers = [context.getHandler(), context.getClass()];
    const platformRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      handlers,
    );
    const tenantRoles = this.reflector.getAllAndOverride<TenantRole[]>(TENANT_ROLES_KEY, handlers);

    if (!platformRoles && !tenantRoles) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException({ code: "FORBIDDEN", message: "Không có quyền" });

    if (platformRoles) {
      if (
        user.type === "PLATFORM" &&
        user.platformRole &&
        platformRoles.includes(user.platformRole)
      ) {
        return true;
      }
      if (!tenantRoles) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Yêu cầu quyền quản trị nền tảng",
        });
      }
    }

    if (tenantRoles) {
      if (user.type === "TENANT" && user.roles.some((r) => tenantRoles.includes(r))) return true;
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Không đủ quyền truy cập" });
    }

    throw new ForbiddenException({ code: "FORBIDDEN", message: "Không đủ quyền truy cập" });
  }
}
