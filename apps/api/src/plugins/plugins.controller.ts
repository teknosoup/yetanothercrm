import {
  All,
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { RequestUser } from '../common/auth/request-user';
import { ListPluginsQuery } from './dto/list-plugins.query';
import { UpsertPluginDto } from './dto/upsert-plugin.dto';
import { PluginsService, type PluginHttpMethod } from './plugins.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('plugins')
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @RequirePermissions('plugin.read')
  @Get()
  async list(@Query() query: ListPluginsQuery) {
    return this.pluginsService.list(query);
  }

  @RequirePermissions('plugin.manage')
  @Patch(':key')
  async upsert(@Param('key') key: string, @Body() dto: UpsertPluginDto) {
    return this.pluginsService.upsert(key, dto);
  }

  @RequirePermissions('plugin.manage')
  @Post(':key/activate')
  async activate(@Param('key') key: string) {
    return this.pluginsService.activate(key);
  }

  @RequirePermissions('plugin.manage')
  @Post(':key/deactivate')
  async deactivate(@Param('key') key: string) {
    return this.pluginsService.deactivate(key);
  }

  @All(':key/:path(*)')
  async dispatchPluginEndpoint(
    @Param('key') key: string,
    @Param('path') path: string,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();

    const method = req.method.toUpperCase();
    const allowed: PluginHttpMethod[] = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ];
    if (!allowed.includes(method as PluginHttpMethod))
      throw new BadRequestException('Unsupported method');

    return this.pluginsService.dispatchEndpoint({
      key,
      method: method as PluginHttpMethod,
      path,
      body: req.body,
      query: req.query as unknown as Record<string, unknown>,
      actorUserId: user.userId,
      roleId: user.roleId,
    });
  }
}
