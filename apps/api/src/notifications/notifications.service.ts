import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQuery } from './dto/list-notifications.query';

type CreateNotificationInput = {
  recipientUserId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(recipientUserId: string, query: ListNotificationsQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where: Prisma.NotificationWhereInput = {
      recipientUserId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async markRead(id: string, recipientUserId: string) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, recipientUserId: true, readAt: true },
    });
    if (!existing || existing.recipientUserId !== recipientUserId) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.readAt) return existing;

    const now = new Date();
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: now },
      select: { id: true, recipientUserId: true, readAt: true },
    });
  }

  async markAllRead(recipientUserId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId, readAt: null },
      data: { readAt: now },
    });
    return { ok: true, updatedCount: result.count };
  }

  async createNotification(input: CreateNotificationInput) {
    try {
      return await this.prisma.notification.create({
        data: {
          recipientUserId: input.recipientUserId,
          type: input.type,
          title: input.title,
          body: input.body,
          entityType: input.entityType,
          entityId: input.entityId,
          dedupeKey: input.dedupeKey,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') return null;
      }
      throw e;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async taskDueReminders() {
    const now = new Date();
    const dueSoon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayKey = now.toISOString().slice(0, 10);

    const [dueSoonTasks, overdueTasks] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where: {
          dueDate: { gte: now, lt: dueSoon },
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] },
        },
        take: 500,
        select: { id: true, title: true, dueDate: true, ownerId: true },
      }),
      this.prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] },
        },
        take: 500,
        select: { id: true, title: true, dueDate: true, ownerId: true },
      }),
    ]);

    await Promise.all(
      dueSoonTasks.map((t) =>
        this.createNotification({
          recipientUserId: t.ownerId,
          type: 'task.due_soon',
          title: `Task due soon: ${t.title}`,
          body: t.dueDate ? `Due at ${t.dueDate.toISOString()}` : null,
          entityType: 'task',
          entityId: t.id,
          dedupeKey: t.dueDate
            ? `task.due_soon:${t.id}:${t.dueDate.toISOString()}`
            : `task.due_soon:${t.id}`,
        }),
      ),
    );

    await Promise.all(
      overdueTasks.map((t) =>
        this.createNotification({
          recipientUserId: t.ownerId,
          type: 'task.overdue',
          title: `Task overdue: ${t.title}`,
          body: t.dueDate ? `Due at ${t.dueDate.toISOString()}` : null,
          entityType: 'task',
          entityId: t.id,
          dedupeKey: `task.overdue:${t.id}:${dayKey}`,
        }),
      ),
    );
  }
}
