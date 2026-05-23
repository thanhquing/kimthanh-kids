import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UserRole, type MarkAttendanceRequest } from '@kimthanh/shared-types';
import { markAttendanceSchema } from '@kimthanh/shared-utils';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { AttendanceService } from './attendance.service';

@ApiBearerAuth()
@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  list(@Query('classroomId') classroomId: string, @Query('date') date: string) {
    return this.attendance.list(classroomId, date);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ZodValidationPipe(markAttendanceSchema))
  mark(@CurrentUser() user: RequestUser, @Body() body: MarkAttendanceRequest) {
    return this.attendance.mark(user.sub, body);
  }
}
