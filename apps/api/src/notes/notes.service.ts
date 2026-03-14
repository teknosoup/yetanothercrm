import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteCommentDto } from './dto/create-note-comment.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';
import { UpdateNoteCommentDto } from './dto/update-note-comment.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

const authorSelect = { id: true, email: true, fullName: true } as const;

type NoteCommentWithAuthor = Prisma.NoteCommentGetPayload<{
  include: { authorUser: { select: typeof authorSelect } };
}>;

type NoteThreadItem = NoteCommentWithAuthor & { replies: NoteThreadItem[] };

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async ensureEntityExists(entityType: string, entityId: string) {
    const normalized = entityType.toLowerCase();
    const exists = await (async () => {
      if (normalized === 'lead')
        return this.prisma.lead.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
      if (normalized === 'account')
        return this.prisma.account.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
      if (normalized === 'contact')
        return this.prisma.contact.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
      if (normalized === 'opportunity')
        return this.prisma.opportunity.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
      return null;
    })();

    if (!exists) throw new BadRequestException('Invalid entity reference');
  }

  async list(query: ListNotesQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;
    const entityType = query.entityType
      ? query.entityType.toLowerCase()
      : undefined;

    const where: Prisma.NoteWhereInput = {
      ...(entityType ? { entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.authorUserId ? { authorUserId: query.authorUserId } : {}),
      ...(query.q
        ? {
            body: { contains: query.q, mode: 'insensitive' },
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          authorUser: { select: authorSelect },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.note.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async create(dto: CreateNoteDto, actorUserId: string) {
    const entityType = dto.entityType.toLowerCase();
    await this.ensureEntityExists(entityType, dto.entityId);

    const note = await this.prisma.note.create({
      data: {
        entityType,
        entityId: dto.entityId,
        body: dto.body,
        isInternal: dto.isInternal ?? true,
        authorUserId: actorUserId,
      },
      include: {
        authorUser: { select: authorSelect },
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'note.create',
      entityType: 'note',
      entityId: note.id,
      after: note,
    });

    return note;
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        authorUser: { select: authorSelect },
        _count: { select: { comments: true } },
      },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async update(id: string, dto: UpdateNoteDto, actorUserId: string) {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Note not found');

    const updated = await this.prisma.note.update({
      where: { id },
      data: {
        body: dto.body,
        isInternal: dto.isInternal,
      },
      include: {
        authorUser: { select: authorSelect },
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'note.update',
      entityType: 'note',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.note.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Note not found');

    await this.prisma.note.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'note.delete',
      entityType: 'note',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }

  private buildThread(comments: NoteCommentWithAuthor[]) {
    const nodeById = new Map<string, NoteThreadItem>();
    for (const c of comments) nodeById.set(c.id, { ...c, replies: [] });

    const roots: NoteThreadItem[] = [];
    for (const node of nodeById.values()) {
      if (node.parentId && nodeById.has(node.parentId)) {
        nodeById.get(node.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortTree = (items: NoteThreadItem[]) => {
      items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (const i of items) sortTree(i.replies);
    };
    sortTree(roots);

    return roots;
  }

  async thread(noteId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        authorUser: { select: authorSelect },
      },
    });
    if (!note) throw new NotFoundException('Note not found');

    const comments = await this.prisma.noteComment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
      include: {
        authorUser: { select: authorSelect },
      },
    });

    return { note, comments: this.buildThread(comments) };
  }

  async createComment(
    noteId: string,
    dto: CreateNoteCommentDto,
    actorUserId: string,
  ) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    const recipients = new Set<string>();
    if (note.authorUserId && note.authorUserId !== actorUserId) {
      recipients.add(note.authorUserId);
    }

    if (dto.parentId) {
      const parent = await this.prisma.noteComment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, noteId: true, authorUserId: true },
      });
      if (!parent || parent.noteId !== noteId)
        throw new BadRequestException('Invalid parent comment');
      if (parent.authorUserId && parent.authorUserId !== actorUserId) {
        recipients.add(parent.authorUserId);
      }
    }

    const comment = await this.prisma.noteComment.create({
      data: {
        noteId,
        parentId: dto.parentId,
        body: dto.body,
        authorUserId: actorUserId,
      },
      include: {
        authorUser: { select: authorSelect },
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'note.comment.create',
      entityType: 'note_comment',
      entityId: comment.id,
      after: comment,
    });

    const snippet = dto.body.trim().slice(0, 140);
    await Promise.all(
      Array.from(recipients).map((recipientUserId) =>
        this.notificationsService.createNotification({
          recipientUserId,
          type: 'note.comment',
          title: 'New comment on note',
          body: snippet.length ? snippet : null,
          entityType: 'note',
          entityId: noteId,
          dedupeKey: `note.comment:${comment.id}`,
        }),
      ),
    );

    return comment;
  }

  async updateComment(
    noteId: string,
    commentId: string,
    dto: UpdateNoteCommentDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.noteComment.findUnique({
      where: { id: commentId },
    });
    if (!existing || existing.noteId !== noteId)
      throw new NotFoundException('Comment not found');

    const updated = await this.prisma.noteComment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: {
        authorUser: { select: authorSelect },
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'note.comment.update',
      entityType: 'note_comment',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async removeComment(noteId: string, commentId: string, actorUserId: string) {
    const existing = await this.prisma.noteComment.findUnique({
      where: { id: commentId },
    });
    if (!existing || existing.noteId !== noteId)
      throw new NotFoundException('Comment not found');

    await this.prisma.noteComment.delete({ where: { id: commentId } });

    await this.auditService.log({
      actorUserId,
      action: 'note.comment.delete',
      entityType: 'note_comment',
      entityId: existing.id,
      before: existing,
    });

    return { id: commentId };
  }
}
