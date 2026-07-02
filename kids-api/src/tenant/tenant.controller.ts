import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TenantRole } from "@prisma/client";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { TenantService } from "./tenant.service";

const settingsSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  emailFromName: z.string().max(120).optional(),
  supportEmail: z.string().email().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(40).optional(),
  // Chứng từ / thanh toán học phí
  taxCode: z.string().max(20).optional(),
  invoiceAddress: z.string().max(200).optional(),
  bankBin: z
    .string()
    .regex(/^\d{6}$/, "Mã ngân hàng napas gồm 6 số")
    .optional(),
  bankAccountNumber: z.string().max(30).optional(),
  bankAccountName: z.string().max(120).optional(),
});
const createMemberSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^(0|\+84)\d{8,10}$/, "Số điện thoại không hợp lệ")
      .optional(),
    fullName: z.string().min(2).max(120),
    role: z.nativeEnum(TenantRole),
    schoolId: z.string().uuid().nullable().optional(),
    password: z.string().min(8),
  })
  .refine((d) => Boolean(d.email || d.phone), {
    message: "Cần email hoặc số điện thoại",
    path: ["email"],
  });
const memberStatusSchema = z.object({ isActive: z.boolean() });
const resetPasswordSchema = z.object({ password: z.string().min(8) });
const schoolSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(20),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
});

@ApiTags("tenant")
@Roles(TenantRole.SCHOOL_ADMIN, TenantRole.PRINCIPAL)
@Controller("tenant")
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get("settings")
  getSettings(@CurrentUser() user: AuthUser) {
    return this.tenant.getSettings(user.tenantId!);
  }

  @Patch("settings")
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(settingsSchema)) dto: z.infer<typeof settingsSchema>,
  ) {
    return this.tenant.updateSettings(user.tenantId!, dto);
  }

  @Get("schools")
  schools() {
    return this.tenant.listSchools();
  }

  @Post("schools")
  createSchool(@Body(new ZodValidationPipe(schoolSchema)) dto: z.infer<typeof schoolSchema>) {
    return this.tenant.createSchool(dto);
  }

  @Get("members")
  members(@CurrentUser() user: AuthUser) {
    return this.tenant.listMembers(user.tenantId!);
  }

  // Tạo tài khoản thành viên (GV/PH/y tá/nhân viên). Chỉ SCHOOL_ADMIN/PRINCIPAL (theo @Roles cấp class).
  @Post("members")
  createMember(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMemberSchema)) dto: z.infer<typeof createMemberSchema>,
  ) {
    return this.tenant.createMember(user.tenantId!, dto, user.id);
  }

  // Đổi trạng thái thành viên (bật/tắt tài khoản). Tắt → chặn đăng nhập + giải phóng quota.
  @Patch("members/:userId/status")
  setMemberStatus(
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(memberStatusSchema)) dto: z.infer<typeof memberStatusSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenant.setMemberStatus(user.tenantId!, userId, dto.isActive, user.id);
  }

  // Đặt lại mật khẩu thành viên khi mobile/CRM chưa có self-service forgot password.
  @Patch("members/:userId/password")
  resetMemberPassword(
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: z.infer<typeof resetPasswordSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenant.resetMemberPassword(user.tenantId!, userId, dto.password, user.id);
  }

  @Get("domains")
  domains(@CurrentUser() user: AuthUser) {
    return this.tenant.listDomains(user.tenantId!);
  }

  @Post("domains")
  addDomain(@CurrentUser() user: AuthUser, @Body() body: { host: string }) {
    return this.tenant.addCustomDomain(user.tenantId!, body.host);
  }

  @Post("domains/:id/verify")
  verifyDomain(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tenant.verifyDomain(user.tenantId!, id);
  }
}
