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
import { CreateNoteCommentDto } from './dto/create-note-comment.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';
import { UpdateNoteCommentDto } from './dto/update-note-comment.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @RequirePermissions('note.read')
  @Get()
  async list(@Query() query: ListNotesQuery) {
    return this.notesService.list(query);
  }

  @RequirePermissions('note.create')
  @Post()
  async create(@Body() dto: CreateNoteDto, @CurrentUser() user: RequestUser) {
    return this.notesService.create(dto, user.userId);
  }

  @RequirePermissions('note.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notesService.findOne(id);
  }

  @RequirePermissions('note.read')
  @Get(':id/thread')
  async thread(@Param('id') id: string) {
    return this.notesService.thread(id);
  }

  @RequirePermissions('note.update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notesService.update(id, dto, user.userId);
  }

  @RequirePermissions('note.delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notesService.remove(id, user.userId);
  }

  @RequirePermissions('note.create')
  @Post(':id/comments')
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateNoteCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notesService.createComment(id, dto, user.userId);
  }

  @RequirePermissions('note.update')
  @Patch(':id/comments/:commentId')
  async updateComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateNoteCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notesService.updateComment(id, commentId, dto, user.userId);
  }

  @RequirePermissions('note.delete')
  @Delete(':id/comments/:commentId')
  async removeComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notesService.removeComment(id, commentId, user.userId);
  }
}
