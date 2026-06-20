import { SetMetadata } from "@nestjs/common";
import { PlatformRole, TenantRole } from "@prisma/client";

export const TENANT_ROLES_KEY = "tenantRoles";
export const PLATFORM_ROLES_KEY = "platformRoles";

/** Yêu cầu user (tenant) có ÍT NHẤT một trong các role. */
export const Roles = (...roles: TenantRole[]) => SetMetadata(TENANT_ROLES_KEY, roles);

/** Yêu cầu user là PLATFORM với một trong các platform role (xuyên tenant). */
export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);
