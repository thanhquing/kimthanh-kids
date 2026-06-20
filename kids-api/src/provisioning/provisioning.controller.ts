import { Body, Controller, Get, Post, Query, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ProvisioningService } from "./provisioning.service";

const signupSchema = z.object({
  schoolName: z.string().min(2).max(120),
  slug: z.string().min(3).max(32),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFullName: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
});
type SignupDto = z.infer<typeof signupSchema>;

@ApiTags("public")
@Public()
@Controller("public")
export class ProvisioningController {
  constructor(private readonly provisioning: ProvisioningService) {}

  @Post("signup")
  @UsePipes(new ZodValidationPipe(signupSchema))
  signup(@Body() dto: SignupDto) {
    return this.provisioning.signup(dto);
  }

  @Get("availability")
  availability(@Query("slug") slug: string) {
    return this.provisioning.checkSlugAvailable((slug ?? "").toLowerCase());
  }

  @Get("branding")
  branding(@Query("host") host: string) {
    return this.provisioning.brandingByHost(host ?? "");
  }
}
