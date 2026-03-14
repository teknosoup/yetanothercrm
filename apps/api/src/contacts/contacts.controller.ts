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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQuery } from './dto/list-contacts.query';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ListTimelineQuery } from '../timeline/dto/list-timeline.query';
import { TimelineService } from '../timeline/timeline.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly timelineService: TimelineService,
  ) {}

  @RequirePermissions('contact.read')
  @Get()
  async list(@Query() query: ListContactsQuery) {
    return this.contactsService.list(query);
  }

  @RequirePermissions('contact.read')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="contacts.csv"')
  @Get('export.csv')
  async exportCsv(@Query() query: ListContactsQuery) {
    return this.contactsService.exportCsv(query);
  }

  @RequirePermissions('contact.create')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="contacts_import_template.csv"',
  )
  @Get('import-template.csv')
  importTemplate() {
    return this.contactsService.importTemplateCsv();
  }

  @RequirePermissions('contact.create')
  @Post()
  async create(
    @Body() dto: CreateContactDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contactsService.create(dto, user.userId);
  }

  @RequirePermissions('contact.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @RequirePermissions('contact.read')
  @Get(':id/history')
  async history(@Param('id') id: string) {
    return this.contactsService.history(id);
  }

  @RequirePermissions('contact.read')
  @Get(':id/timeline')
  async timeline(@Param('id') id: string, @Query() query: ListTimelineQuery) {
    return this.timelineService.contact(id, query);
  }

  @RequirePermissions('contact.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contactsService.update(id, dto, user.userId);
  }

  @RequirePermissions('contact.delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.contactsService.remove(id, user.userId);
  }
}
