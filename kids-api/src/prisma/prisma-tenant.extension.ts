import { Prisma } from "@prisma/client";
import { TenantContextStore } from "../common/context/tenant-context";

/**
 * Các model bị cô lập theo tenant + cột khoá tenant tương ứng.
 * - "Tenant" tự nó cô lập theo `id` (tenant chỉ thấy chính mình).
 * - Các model khác cô lập theo `tenantId`.
 * Model KHÔNG nằm đây (Plan, PlanPrice, Coupon, User, RefreshToken...) là global hoặc
 * được scope tường minh trong service (User: auth cần truy vấn đặc thù).
 */
const TENANT_KEY: Record<string, "id" | "tenantId"> = {
  Tenant: "id",
  TenantSettings: "tenantId",
  TenantDomain: "tenantId",
  School: "tenantId",
  Membership: "tenantId",
  Subscription: "tenantId",
  PlatformInvoice: "tenantId",
  PlatformPayment: "tenantId",
  TenantEntitlement: "tenantId",
  UsageCounter: "tenantId",
  CreditLedger: "tenantId",
  // ── Tầng B domain (Phase 1) ──
  Classroom: "tenantId",
  Student: "tenantId",
  StudentParent: "tenantId",
  Attendance: "tenantId",
  DailyReport: "tenantId",
  Media: "tenantId",
  // ── D — Sức khỏe (Phase 1) ──
  HealthRecord: "tenantId",
  MedicineRequest: "tenantId",
  MedicineStatusHistory: "tenantId",
  Incident: "tenantId",
  Allergy: "tenantId",
  LeaveRequest: "tenantId",
  StaffAssignment: "tenantId",
  // ── E — Học phí (Phase 1) ──
  TuitionInvoice: "tenantId",
  TuitionInvoiceItem: "tenantId",
  TuitionPayment: "tenantId",
  // ── F — Giao tiếp & nội dung (Phase 1) ──
  Announcement: "tenantId",
  WeeklyMenu: "tenantId",
  Meal: "tenantId",
  LessonPlan: "tenantId",
  Activity: "tenantId",
  Album: "tenantId",
  AlbumPhoto: "tenantId",
};

/** Model có cột deletedAt → đọc tự bỏ bản ghi đã xoá. Soft-delete khi GHI là convention service. */
const SOFT_DELETE = new Set<string>([
  "Tenant",
  "School",
  "Membership",
  "Plan",
  "Subscription",
  "PlatformInvoice",
  "Classroom",
  "Student",
]);

const READ_MANY = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const WRITE_MANY = new Set(["updateMany", "deleteMany"]);

/**
 * Client extension: tự inject điều kiện tenant + filter soft-delete vào truy vấn.
 *
 * GIỚI HẠN có chủ đích: findUnique/update/delete theo khoá chính đơn KHÔNG được inject
 * tenantId (where chỉ nhận field unique). Service đọc/sửa bản ghi đơn theo tenant PHẢI dùng
 * findFirst, hoặc kiểm tra quyền sở hữu sau khi fetch. Soft-delete khi ghi: service gọi
 * update({ data: { deletedAt: new Date() } }) thay vì delete. Xem docs/MULTI_TENANCY.md.
 */
export function tenantExtension() {
  return Prisma.defineExtension({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const key = model ? TENANT_KEY[model] : undefined;
          const tenantId = TenantContextStore.effectiveTenantId();
          const isSoftDelete = model ? SOFT_DELETE.has(model) : false;
          const a: Record<string, unknown> = { ...((args as Record<string, unknown>) ?? {}) };

          // 1) Tenant isolation
          if (key && tenantId && (READ_MANY.has(operation) || WRITE_MANY.has(operation))) {
            a.where = { ...((a.where as object) ?? {}), [key]: tenantId };
          }
          if (key === "tenantId" && tenantId && operation === "create") {
            a.data = { ...((a.data as object) ?? {}), tenantId };
          }
          if (key === "tenantId" && tenantId && operation === "createMany") {
            const data = a.data;
            if (Array.isArray(data)) a.data = data.map((d) => ({ ...(d as object), tenantId }));
            else if (data) a.data = { ...(data as object), tenantId };
          }

          // 2) Soft-delete: chỉ filter ở chiều ĐỌC (deletedAt: null nếu chưa chỉ định)
          if (isSoftDelete && READ_MANY.has(operation)) {
            const where = (a.where as Record<string, unknown>) ?? {};
            if (where.deletedAt === undefined) a.where = { ...where, deletedAt: null };
          }

          return query(a as never);
        },
      },
    },
  });
}
