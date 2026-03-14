import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ListAccountsQuery } from './dto/list-accounts.query';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ListTimelineQuery } from '../timeline/dto/list-timeline.query';
import { TimelineService } from '../timeline/timeline.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly timelineService: TimelineService,
  ) {}

  @RequirePermissions('account.read')
  @Get()
  async list(@Query() query: ListAccountsQuery) {
    return this.accountsService.list(query);
  }

  @RequirePermissions('account.read')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="accounts.csv"')
  @Get('export.csv')
  async exportCsv(@Query() query: ListAccountsQuery) {
    return this.accountsService.exportCsv(query);
  }

  @RequirePermissions('account.create')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="accounts_import_template.csv"',
  )
  @Get('import-template.csv')
  importTemplate() {
    return this.accountsService.importTemplateCsv();
  }

  @RequirePermissions('account.create')
  @Post()
  async create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accountsService.create(dto, user.userId);
  }

  @RequirePermissions('account.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @RequirePermissions('account.read')
  @Get(':id/timeline')
  async timeline(@Param('id') id: string, @Query() query: ListTimelineQuery) {
    return this.timelineService.account(id, query);
  }

  @RequirePermissions('account.read')
  @Get(':id/relations')
  async relations(@Param('id') id: string) {
    return this.accountsService.findRelations(id);
  }

  @RequirePermissions('account.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accountsService.update(id, dto, user.userId);
  }

  @RequirePermissions('account.delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.accountsService.remove(id, user.userId);
  }
}
