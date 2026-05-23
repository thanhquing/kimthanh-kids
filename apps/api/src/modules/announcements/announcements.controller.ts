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

import { UserRole, type CreateAnnouncementRequest } from '@kimthanh/shared-types';
import { createAnnouncementSchema } from '@kimthanh/shared-utils';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { AnnouncementsService } from './announcements.service';

@ApiBearerAuth()
@ApiTags('announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.announcements.list(user, page, pageSize);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  @UsePipes(new ZodValidationPipe(createAnnouncementSchema))
  create(@CurrentUser() user: RequestUser, @Body() body: CreateAnnouncementRequest) {
    return this.announcements.create(user, body);
  }
}
