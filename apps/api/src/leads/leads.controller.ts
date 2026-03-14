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
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQuery } from './dto/list-leads.query';
import { MergeLeadDto } from './dto/merge-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';
import { ListTimelineQuery } from '../timeline/dto/list-timeline.query';
import { TimelineService } from '../timeline/timeline.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly timelineService: TimelineService,
  ) {}

  @RequirePermissions('lead.read')
  @Get()
  async list(@Query() query: ListLeadsQuery) {
    return this.leadsService.list(query);
  }

  @RequirePermissions('lead.read')
  @Get('duplicates')
  async duplicates() {
    return this.leadsService.findDuplicates();
  }

  @RequirePermissions('lead.create')
  @Post()
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: RequestUser) {
    return this.leadsService.create(dto, user.userId);
  }

  @RequirePermissions('lead.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @RequirePermissions('lead.read')
  @Get(':id/timeline')
  async timeline(@Param('id') id: string, @Query() query: ListTimelineQuery) {
    return this.timelineService.lead(id, query);
  }

  @RequirePermissions('lead.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.update(id, dto, user.userId);
  }

  @RequirePermissions('lead.delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.leadsService.remove(id, user.userId);
  }

  @RequirePermissions('lead.convert')
  @Post(':id/convert')
  async convert(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.leadsService.convert(id, user.userId);
  }

  @RequirePermissions('lead.assign')
  @Post(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.assign(id, dto.ownerId, user.userId);
  }

  @RequirePermissions('lead.merge')
  @Post(':id/merge')
  async merge(
    @Param('id') id: string,
    @Body() dto: MergeLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.merge(id, dto.sourceLeadIds, user.userId);
  }
}
