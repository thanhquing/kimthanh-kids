import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaymentStatus } from '@kimthanh/shared-types';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';

import { FinanceService } from './finance.service';

@ApiBearerAuth()
@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('invoices')
  listInvoices(
    @CurrentUser() user: RequestUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('studentId') studentId?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.finance.listInvoices(user, { page, pageSize, studentId, status });
  }
}
