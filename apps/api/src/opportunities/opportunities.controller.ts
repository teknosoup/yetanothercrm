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
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { ListOpportunitiesQuery } from './dto/list-opportunities.query';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunitiesService } from './opportunities.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @RequirePermissions('opportunity.read')
  @Get()
  async list(@Query() query: ListOpportunitiesQuery) {
    return this.opportunitiesService.list(query);
  }

  @RequirePermissions('opportunity.create')
  @Post()
  async create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.opportunitiesService.create(dto, user.userId);
  }

  @RequirePermissions('opportunity.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @RequirePermissions('opportunity.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.opportunitiesService.update(id, dto, user.userId);
  }

  @RequirePermissions('opportunity.update')
  @Post(':id/stage')
  async changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.opportunitiesService.changeStage(id, dto, user.userId);
  }

  @RequirePermissions('opportunity.read')
  @Get(':id/stage-history')
  async stageHistory(@Param('id') id: string) {
    return this.opportunitiesService.stageHistory(id);
  }

  @RequirePermissions('opportunity.delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.opportunitiesService.remove(id, user.userId);
  }
}
