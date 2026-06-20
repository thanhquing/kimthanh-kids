import { Body, Controller, Get, Post, Req, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AllowInactive } from "../common/decorators/subscription.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, loginSchema, refreshSchema } from "./auth.dto";

@ApiTags("auth")
@AllowInactive()
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, { userAgent: req.headers["user-agent"], ip: req.ip });
  }

  @Public()
  @Post("refresh")
  @UsePipes(new ZodValidationPipe(refreshSchema))
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  }

  @Post("logout")
  @UsePipes(new ZodValidationPipe(refreshSchema))
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
