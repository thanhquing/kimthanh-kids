import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { PlatformService } from "./platform.service";

/**
 * Hóa đơn nền tảng qua LINK CÔNG KHAI — không cần đăng nhập. Token uuid khó đoán
 * (giống hosted-invoice). Trả dữ liệu đã lọc (bỏ id/token nội bộ) đủ để xem + thanh toán VietQR.
 */
@ApiTags("public")
@Public()
@Controller("public/platform-invoices")
export class PublicInvoiceController {
  constructor(private readonly platform: PlatformService) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.platform.getPublicInvoice(token);
  }
}
