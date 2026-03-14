import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { RequestUser } from '../common/auth/request-user';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ListActivitiesQuery } from './dto/list-activities.query';
import { UpdateActivityDto } from './dto/update-activity.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @RequirePermissions('activity.read')
  @Get()
  async list(@Query() query: ListActivitiesQuery) {
    return this.activitiesService.list(query);
  }

  @RequirePermissions('activity.create')
  @Post()
  async create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.activitiesService.create(dto, user.userId);
  }

  @RequirePermissions('activity.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @RequirePermissions('activity.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.activitiesService.update(id, dto, user.userId);
  }

  @RequirePermissions('activity.delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.activitiesService.remove(id, user.userId);
  }
}
