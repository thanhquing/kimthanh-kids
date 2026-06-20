import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { EntitlementService } from "../../entitlement/entitlement.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ALLOW_INACTIVE_KEY } from "../decorators/subscription.decorator";
import { REQUIRE_FEATURE_KEY } from "../decorators/entitlement.decorator";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Enforce trạng thái subscription + feature-gating cho user TENANT:
 * - ACTIVE / TRIALING → full.
 * - PAST_DUE → full (chỉ nhắc nợ, set header cảnh báo).
 * - SUSPENDED → chỉ đọc (GET) hoặc route @AllowInactive (billing).
 * - CANCELED / EXPIRED → chặn, trừ route @AllowInactive.
 * - @RequireFeature(key) → chặn nếu gói không bật feature.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user || user.type === "PLATFORM" || !user.tenantId) return true;

    const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_INACTIVE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const sub = await this.prisma.system.subscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { status: true },
    });
    const status = sub?.status ?? "EXPIRED";

    if (status === "SUSPENDED") {
      if (!allowInactive && !READ_METHODS.has(req.method)) {
        throw new ForbiddenException({
          code: "SUBSCRIPTION_SUSPENDED",
          message:
            "Thuê bao đang bị tạm khoá do quá hạn thanh toán. Vui lòng thanh toán để mở lại.",
        });
      }
    } else if (status === "CANCELED" || status === "EXPIRED") {
      if (!allowInactive) {
        throw new ForbiddenException({
          code: "SUBSCRIPTION_INACTIVE",
          message: "Thuê bao đã kết thúc. Vui lòng kích hoạt lại gói dịch vụ.",
        });
      }
    } else if (status === "PAST_DUE") {
      req.res?.setHeader("X-Subscription-Status", "PAST_DUE");
    }

    // Feature-gating
    const feature = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (feature) {
      const ok = await this.entitlements.hasFeature(user.tenantId, feature);
      if (!ok) {
        throw new ForbiddenException({
          code: "FEATURE_NOT_AVAILABLE",
          message: `Gói hiện tại không bao gồm tính năng "${feature}". Vui lòng nâng cấp.`,
        });
      }
    }

    return true;
  }
}
