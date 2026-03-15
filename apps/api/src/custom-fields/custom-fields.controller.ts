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
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { ListCustomFieldsQuery } from './dto/list-custom-fields.query';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { CustomFieldsService } from './custom-fields.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @RequirePermissions('custom_field.read')
  @Get()
  async list(@Query() query: ListCustomFieldsQuery) {
    return this.customFieldsService.listDefinitions(query);
  }

  @RequirePermissions('custom_field.manage')
  @Post()
  async create(@Body() dto: CreateCustomFieldDto) {
    return this.customFieldsService.createDefinition(dto);
  }

  @RequirePermissions('custom_field.manage')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomFieldDto) {
    return this.customFieldsService.updateDefinition(id, dto);
  }

  @RequirePermissions('custom_field.manage')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customFieldsService.deleteDefinition(id);
  }
}
