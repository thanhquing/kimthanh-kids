import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UserRole, type CreateDailyReportRequest } from '@kimthanh/shared-types';
import { createDailyReportSchema } from '@kimthanh/shared-utils';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { ReportsService } from './reports.service';

@ApiBearerAuth()
@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('students/:studentId/reports')
  listForStudent(
    @Param('studentId') studentId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.reports.listForStudent(studentId, page, pageSize);
  }

  @Post('reports')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(createDailyReportSchema))
  create(@CurrentUser() user: RequestUser, @Body() body: CreateDailyReportRequest) {
    return this.reports.create(user.sub, body);
  }
}
