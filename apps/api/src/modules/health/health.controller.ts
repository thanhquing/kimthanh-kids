import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  MedicineRequestStatus,
  UserRole,
  type CreateMedicineRequestPayload,
} from '@kimthanh/shared-types';
import { createMedicineRequestSchema } from '@kimthanh/shared-utils';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { HealthService } from './health.service';

@ApiBearerAuth()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('medicine-requests')
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('studentId') studentId?: string,
    @Query('status') status?: MedicineRequestStatus,
  ) {
    return this.health.listMedicineRequests({ page, pageSize, studentId, status });
  }

  @Post('medicine-requests')
  @Roles(UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(createMedicineRequestSchema))
  create(@CurrentUser() user: RequestUser, @Body() body: CreateMedicineRequestPayload) {
    return this.health.createMedicineRequest(user.sub, body);
  }
}
