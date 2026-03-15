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
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { RequestUser } from '../common/auth/request-user';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQuery } from './dto/list-roles.query';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RbacService } from './rbac.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rbacService: RbacService) {}

  @RequirePermissions('role.manage')
  @Get()
  async list(@Query() query: ListRolesQuery) {
    return this.rbacService.listRoles(query);
  }

  @RequirePermissions('role.manage')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.rbacService.findRole(id);
  }

  @RequirePermissions('role.manage')
  @Post()
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: RequestUser) {
    return this.rbacService.createRole(dto, user.userId);
  }

  @RequirePermissions('role.manage')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rbacService.updateRole(id, dto, user.userId);
  }

  @RequirePermissions('role.manage')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.rbacService.deleteRole(id, user.userId);
  }
}
