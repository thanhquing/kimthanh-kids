import { Body, Controller, Get, Post, Query, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { BillingCycle } from "@prisma/client";
import { z } from "zod";
import { BillingService } from "../billing/billing.service";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { isValidTaxCode } from "../common/validation/tax-code";
import { ProvisioningService } from "./provisioning.service";

const signupSchema = z.object({
  schoolName: z.string().min(2).max(120),
  slug: z.string().min(3).max(32),
  code: z.string().min(3).max(20).optional(),
  taxCode: z
    .string()
    .refine(isValidTaxCode, { message: "Mã số thuế không hợp lệ (10 hoặc 13 chữ số)" }),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFullName: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
  planCode: z.string().min(2).max(40).optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});
type SignupDto = z.infer<typeof signupSchema>;

@ApiTags("public")
@Public()
@Controller("public")
export class ProvisioningController {
  constructor(
    private readonly provisioning: ProvisioningService,
    private readonly billing: BillingService,
  ) {}

  @Get("plans")
  plans() {
    return this.billing.listPublicPlans();
  }

  @Post("signup")
  @UsePipes(new ZodValidationPipe(signupSchema))
  signup(@Body() dto: SignupDto) {
    return this.provisioning.signup(dto);
  }

  @Get("availability")
  availability(@Query("slug") slug: string) {
    return this.provisioning.checkSlugAvailable((slug ?? "").toLowerCase());
  }

  // Search công khai để chọn tenant ở login (theo tên/mã trường/MST). Độc lập subdomain.
  @Get("tenants")
  searchTenants(@Query("q") q: string) {
    return this.provisioning.searchTenants(q ?? "");
  }

  @Get("branding")
  branding(@Query("host") host: string) {
    return this.provisioning.brandingByHost(host ?? "");
  }
}
