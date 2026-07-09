import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AllowInactive } from "../common/decorators/subscription.decorator";
import { EnvService } from "../config/env.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "./auth-cookie";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, loginSchema, refreshSchema } from "./auth.dto";
import { TokenService } from "./token.service";

const loginPipe = new ZodValidationPipe(loginSchema);
const refreshPipe = new ZodValidationPipe(refreshSchema);

@ApiTags("auth")
@AllowInactive()
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly env: EnvService,
  ) {}

  @Public()
  @Post("login")
  async login(
    @Body(loginPipe) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.auth.login(dto, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    setRefreshCookie(res, refreshToken, this.tokens.refreshTtlMs(), this.env);
    // KHÔNG trả refreshToken ra body — chỉ nằm trong cookie HttpOnly.
    return rest;
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Body(refreshPipe) dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = readRefreshCookie(req) ?? dto.refreshToken;
    if (!token) {
      throw new UnauthorizedException({
        code: "INVALID_REFRESH",
        message: "Refresh token không hợp lệ",
      });
    }
    const { refreshToken, accessToken } = await this.auth.refresh(token, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    setRefreshCookie(res, refreshToken, this.tokens.refreshTtlMs(), this.env);
    return { accessToken };
  }

  @Post("logout")
  async logout(
    @Body(refreshPipe) dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = readRefreshCookie(req) ?? dto.refreshToken;
    if (token) await this.auth.logout(token);
    clearRefreshCookie(res, this.env);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
