import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Ngữ cảnh của 1 request, lan truyền qua AsyncLocalStorage.
 * - tenantId: ranh giới BẢO MẬT. Khi set (và !platformScope) → Prisma extension auto-filter.
 * - platformScope: true cho platform admin (PLATFORM_SUPER_ADMIN...) → bỏ qua auto-filter, truy cập xuyên tenant.
 * - allowedSchoolIds: tập school user được phép (null = toàn tenant / chuỗi).
 * - bypassTenant: chỉ provisioning/seed dùng (tạo tenant mới) — KHÔNG bao giờ bật ngầm.
 */
export interface TenantContext {
  tenantId?: string;
  userId?: string;
  userType?: "PLATFORM" | "TENANT";
  allowedSchoolIds?: string[] | null;
  platformScope?: boolean;
  bypassTenant?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

export const TenantContextStore = {
  run<T>(ctx: TenantContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },

  get(): TenantContext | undefined {
    return storage.getStore();
  },

  /** tenantId hiệu lực cho auto-filter (undefined nếu platformScope/bypass). */
  effectiveTenantId(): string | undefined {
    const ctx = storage.getStore();
    if (!ctx || ctx.platformScope || ctx.bypassTenant) return undefined;
    return ctx.tenantId;
  },

  /** Cập nhật field trong context hiện tại (vd guard set userId sau khi xác thực). */
  patch(partial: Partial<TenantContext>): void {
    const ctx = storage.getStore();
    if (ctx) Object.assign(ctx, partial);
  },
};
