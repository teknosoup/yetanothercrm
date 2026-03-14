import {
  Body,
  Controller,
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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.usersService.findMe(user.userId);
  }

  @RequirePermissions('user.read')
  @Get()
  async list(@Query() query: ListUsersQuery) {
    return this.usersService.list(query);
  }

  @RequirePermissions('user.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermissions('user.manage')
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(dto, user.userId);
  }

  @RequirePermissions('user.manage')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(id, dto, user.userId);
  }

  @RequirePermissions('user.manage')
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.resetPassword(id, dto, user.userId);
  }
}
