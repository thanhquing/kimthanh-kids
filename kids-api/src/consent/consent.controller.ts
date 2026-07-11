import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { z } from "zod";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ConsentService } from "./consent.service";

const acceptSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
});

@ApiTags("consent")
@Controller()
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  /** Văn bản pháp lý đang hiệu lực — công khai (landing đọc để render + tick). */
  @Public()
  @Get("public/legal")
  legal() {
    return this.consent.activeDocuments("vi");
  }

  /** Văn bản user hiện tại chưa đồng ý (gate đăng nhập GV/PH/NV). */
  @Get("consent/pending")
  pending(@CurrentUser() user: AuthUser) {
    return this.consent.pendingForUser(user.id, "vi");
  }

  /** Ghi nhận user đồng ý (kèm IP/User-Agent làm bằng chứng). */
  @Post("consent/accept")
  accept(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(acceptSchema)) dto: z.infer<typeof acceptSchema>,
    @Req() req: Request,
  ) {
    return this.consent.accept(dto.documentIds, {
      userId: user.id,
      tenantId: user.tenantId ?? null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}
