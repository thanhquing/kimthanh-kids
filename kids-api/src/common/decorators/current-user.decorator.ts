import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { PlatformRole, TenantRole, UserType } from "@prisma/client";

/** Thông tin user đã xác thực, gắn vào request bởi JwtAuthGuard. */
export interface AuthUser {
  id: string;
  type: UserType;
  tenantId: string | null;
  platformRole: PlatformRole | null;
  /** role trong tenant (gộp từ Membership), kèm school scope. */
  roles: TenantRole[];
  allowedSchoolIds: string[] | null; // null = toàn tenant
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);
