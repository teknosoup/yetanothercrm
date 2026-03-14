import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { RequestUser } from '../common/auth/request-user';
import { ListNotificationsQuery } from './dto/list-notifications.query';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermissions('notification.read')
  @Get()
  async list(
    @Query() query: ListNotificationsQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationsService.list(user.userId, query);
  }

  @RequirePermissions('notification.update')
  @Post(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markRead(id, user.userId);
  }

  @RequirePermissions('notification.update')
  @Post('read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllRead(user.userId);
  }
}
