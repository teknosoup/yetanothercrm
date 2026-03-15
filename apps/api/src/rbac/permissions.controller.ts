import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { ListPermissionsQuery } from './dto/list-permissions.query';
import { RbacService } from './rbac.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly rbacService: RbacService) {}

  @RequirePermissions('role.manage')
  @Get()
  async list(@Query() query: ListPermissionsQuery) {
    return this.rbacService.listPermissions(query);
  }
}
