import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';

import { ClassroomsService } from './classrooms.service';

@ApiBearerAuth()
@ApiTags('classrooms')
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classrooms: ClassroomsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.classrooms.list(user);
  }
}
