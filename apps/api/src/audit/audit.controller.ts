import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { AuditService } from './audit.service';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @RequirePermissions('audit.read')
  @Get('logs')
  async list(@Query() query: ListAuditLogsQuery) {
    return this.auditService.list(query);
  }
}
