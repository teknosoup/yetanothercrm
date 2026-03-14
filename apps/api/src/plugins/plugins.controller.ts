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
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { ListPluginsQuery } from './dto/list-plugins.query';
import { UpsertPluginDto } from './dto/upsert-plugin.dto';
import { PluginsService } from './plugins.service';

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
    return this.pluginsService.setActive(key, true);
  }

  @RequirePermissions('plugin.manage')
  @Post(':key/deactivate')
  async deactivate(@Param('key') key: string) {
    return this.pluginsService.setActive(key, false);
  }
}
