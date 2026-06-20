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
});
const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  role: z.nativeEnum(TenantRole),
  schoolId: z.string().uuid().nullable().optional(),
  password: z.string().min(8),
});
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

  @Post("members/invite")
  invite(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(inviteSchema)) dto: z.infer<typeof inviteSchema>,
  ) {
    return this.tenant.inviteMember(user.tenantId!, dto);
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
