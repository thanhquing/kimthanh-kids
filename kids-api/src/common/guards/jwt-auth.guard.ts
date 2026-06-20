import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { TokenService } from "../../auth/token.service";
import { UserContextService } from "../../auth/user-context.service";
import { TenantContextStore } from "../context/tenant-context";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Xác thực access token → gắn req.user (AuthUser) → patch ALS context.
 * Bỏ qua khi route gắn @Public.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UserContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearer(req);
    if (!token)
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Thiếu access token" });

    let payload;
    try {
      payload = await this.tokens.verifyAccess(token);
    } catch {
      throw new UnauthorizedException({
        code: "INVALID_TOKEN",
        message: "Token không hợp lệ hoặc hết hạn",
      });
    }

    const user = await this.users.load(payload.sub);
    if (!user)
      throw new UnauthorizedException({
        code: "USER_INACTIVE",
        message: "Tài khoản không khả dụng",
      });

    (req as Request & { user?: unknown }).user = user;

    // Patch ALS: platform user → bypass filter; tenant user → giữ tenantId từ host hoặc fallback JWT.
    const current = TenantContextStore.get();
    TenantContextStore.patch({
      userId: user.id,
      userType: user.type,
      platformScope: user.type === "PLATFORM",
      tenantId:
        user.type === "TENANT"
          ? (current?.tenantId ?? user.tenantId ?? undefined)
          : current?.tenantId,
      allowedSchoolIds: user.allowedSchoolIds,
    });

    return true;
  }

  private extractBearer(req: Request): string | null {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const [scheme, value] = auth.split(" ");
    return scheme === "Bearer" && value ? value : null;
  }
}
