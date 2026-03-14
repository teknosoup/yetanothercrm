import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsQuery } from './dto/dashboard-metrics.query';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermissions('dashboard.read')
  @Get('metrics')
  async metrics(@Query() query: DashboardMetricsQuery) {
    return this.dashboardService.metrics(query);
  }
}
