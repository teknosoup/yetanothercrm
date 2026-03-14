import { Injectable, NotFoundException } from '@nestjs/common';
import type { Activity, Prisma, Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTimelineQuery } from './dto/list-timeline.query';

const actorUserSelect = { id: true, fullName: true, email: true } as const;

type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: { actorUser: { select: typeof actorUserSelect } };
}>;

type OpportunityStageHistoryWithActor =
  Prisma.OpportunityStageHistoryGetPayload<{
    include: { actorUser: { select: typeof actorUserSelect } };
  }>;

type NoteWithAuthor = Prisma.NoteGetPayload<{
  include: { authorUser: { select: typeof actorUserSelect } };
}>;

type TimelineData =
  | AuditLogWithActor
  | Activity
  | Task
  | NoteWithAuthor
  | OpportunityStageHistoryWithActor;

type TimelineItem = {
  kind: 'audit' | 'activity' | 'task' | 'note' | 'opportunity_stage';
  occurredAt: Date;
  data: TimelineData;
};

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  private auditLogs(entityType: string, entityId: string, take: number) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actorUser: { select: actorUserSelect },
      },
    });
  }

  private notes(entityType: string, entityId: string, take: number) {
    return this.prisma.note.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        authorUser: { select: actorUserSelect },
      },
    });
  }

  private normalize(items: TimelineItem[], query: ListTimelineQuery) {
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;
    const sorted = items.sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
    const total = sorted.length;
    const paged = sorted.slice(skip, skip + take);
    return { items: paged, total, skip, take };
  }

  async lead(id: string, query: ListTimelineQuery) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const [auditLogs, notes, activities, tasks] =
      await this.prisma.$transaction([
        this.auditLogs('lead', id, 200),
        this.notes('lead', id, 200),
        this.prisma.activity.findMany({
          where: { leadId: id },
          orderBy: { occurredAt: 'desc' },
          take: 200,
        }),
        this.prisma.task.findMany({
          where: { leadId: id },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      ] as const);

    const items: TimelineItem[] = [
      ...auditLogs.map((l) => ({
        kind: 'audit' as const,
        occurredAt: l.createdAt,
        data: l,
      })),
      ...notes.map((n) => ({
        kind: 'note' as const,
        occurredAt: n.createdAt,
        data: n,
      })),
      ...activities.map((a) => ({
        kind: 'activity' as const,
        occurredAt: a.occurredAt,
        data: a,
      })),
      ...tasks.map((t) => ({
        kind: 'task' as const,
        occurredAt: t.createdAt,
        data: t,
      })),
    ];

    return {
      entityType: 'lead',
      entityId: id,
      ...this.normalize(items, query),
    };
  }

  async account(id: string, query: ListTimelineQuery) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Account not found');

    const [auditLogs, notes, activities, tasks] =
      await this.prisma.$transaction([
        this.auditLogs('account', id, 200),
        this.notes('account', id, 200),
        this.prisma.activity.findMany({
          where: { accountId: id },
          orderBy: { occurredAt: 'desc' },
          take: 200,
        }),
        this.prisma.task.findMany({
          where: { accountId: id },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      ] as const);

    const items: TimelineItem[] = [
      ...auditLogs.map((l) => ({
        kind: 'audit' as const,
        occurredAt: l.createdAt,
        data: l,
      })),
      ...notes.map((n) => ({
        kind: 'note' as const,
        occurredAt: n.createdAt,
        data: n,
      })),
      ...activities.map((a) => ({
        kind: 'activity' as const,
        occurredAt: a.occurredAt,
        data: a,
      })),
      ...tasks.map((t) => ({
        kind: 'task' as const,
        occurredAt: t.createdAt,
        data: t,
      })),
    ];

    return {
      entityType: 'account',
      entityId: id,
      ...this.normalize(items, query),
    };
  }

  async contact(id: string, query: ListTimelineQuery) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const [auditLogs, notes, activities, tasks] =
      await this.prisma.$transaction([
        this.auditLogs('contact', id, 200),
        this.notes('contact', id, 200),
        this.prisma.activity.findMany({
          where: { contactId: id },
          orderBy: { occurredAt: 'desc' },
          take: 200,
        }),
        this.prisma.task.findMany({
          where: { contactId: id },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      ] as const);

    const items: TimelineItem[] = [
      ...auditLogs.map((l) => ({
        kind: 'audit' as const,
        occurredAt: l.createdAt,
        data: l,
      })),
      ...notes.map((n) => ({
        kind: 'note' as const,
        occurredAt: n.createdAt,
        data: n,
      })),
      ...activities.map((a) => ({
        kind: 'activity' as const,
        occurredAt: a.occurredAt,
        data: a,
      })),
      ...tasks.map((t) => ({
        kind: 'task' as const,
        occurredAt: t.createdAt,
        data: t,
      })),
    ];

    return {
      entityType: 'contact',
      entityId: id,
      ...this.normalize(items, query),
    };
  }

  async opportunity(id: string, query: ListTimelineQuery) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const [auditLogs, notes, activities, tasks, stageHistory] =
      await this.prisma.$transaction([
        this.auditLogs('opportunity', id, 200),
        this.notes('opportunity', id, 200),
        this.prisma.activity.findMany({
          where: { opportunityId: id },
          orderBy: { occurredAt: 'desc' },
          take: 200,
        }),
        this.prisma.task.findMany({
          where: { opportunityId: id },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.opportunityStageHistory.findMany({
          where: { opportunityId: id },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            actorUser: { select: actorUserSelect },
          },
        }),
      ] as const);

    const items: TimelineItem[] = [
      ...auditLogs.map((l) => ({
        kind: 'audit' as const,
        occurredAt: l.createdAt,
        data: l,
      })),
      ...notes.map((n) => ({
        kind: 'note' as const,
        occurredAt: n.createdAt,
        data: n,
      })),
      ...activities.map((a) => ({
        kind: 'activity' as const,
        occurredAt: a.occurredAt,
        data: a,
      })),
      ...tasks.map((t) => ({
        kind: 'task' as const,
        occurredAt: t.createdAt,
        data: t,
      })),
      ...stageHistory.map((s) => ({
        kind: 'opportunity_stage' as const,
        occurredAt: s.createdAt,
        data: s,
      })),
    ];

    return {
      entityType: 'opportunity',
      entityId: id,
      ...this.normalize(items, query),
    };
  }
}
