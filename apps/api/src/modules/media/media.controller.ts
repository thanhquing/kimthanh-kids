import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('media')
@Controller('media')
export class MediaController {
  @Get('health')
  health() {
    return { ok: true };
  }
}
