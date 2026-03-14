import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListTasksQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where: Prisma.TaskWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.opportunityId ? { opportunityId: query.opportunityId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.dueFrom || query.dueTo
        ? {
            dueDate: {
              ...(query.dueFrom ? { gte: query.dueFrom } : {}),
              ...(query.dueTo ? { lte: query.dueTo } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async overdue(query: {
    ownerId?: string;
    asOf?: Date;
    skip?: number;
    take?: number;
  }) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;
    const asOf = query.asOf ?? new Date();

    const where: Prisma.TaskWhereInput = {
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      dueDate: { lt: asOf },
      status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, skip, take, asOf };
  }

  async overdueSummary(query: { asOf?: Date }) {
    const asOf = query.asOf ?? new Date();

    const rows = await this.prisma.task.groupBy({
      by: ['ownerId'],
      where: {
        dueDate: { lt: asOf },
        status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] },
      },
      _count: { _all: true },
      orderBy: { ownerId: 'asc' },
    });

    const ownerIds = rows.map((r) => r.ownerId);
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, fullName: true, email: true },
    });

    const ownerById = new Map(owners.map((o) => [o.id, o]));

    const items = rows.map((r) => {
      const owner = ownerById.get(r.ownerId);
      return {
        ownerId: r.ownerId,
        ownerFullName: owner?.fullName ?? null,
        ownerEmail: owner?.email ?? null,
        overdueCount: r._count._all,
      };
    });

    return { asOf, items };
  }

  private async ensureRelationsExist(dto: {
    leadId?: string;
    accountId?: string;
    contactId?: string;
    opportunityId?: string;
  }) {
    const checks: Array<Promise<unknown>> = [];

    if (dto.leadId) {
      checks.push(
        this.prisma.lead.findUnique({
          where: { id: dto.leadId },
          select: { id: true },
        }),
      );
    }
    if (dto.accountId) {
      checks.push(
        this.prisma.account.findUnique({
          where: { id: dto.accountId },
          select: { id: true },
        }),
      );
    }
    if (dto.contactId) {
      checks.push(
        this.prisma.contact.findUnique({
          where: { id: dto.contactId },
          select: { id: true },
        }),
      );
    }
    if (dto.opportunityId) {
      checks.push(
        this.prisma.opportunity.findUnique({
          where: { id: dto.opportunityId },
          select: { id: true },
        }),
      );
    }

    const results = await Promise.all(checks);
    if (dto.leadId && !results.shift())
      throw new BadRequestException('Lead not found');
    if (dto.accountId && !results.shift())
      throw new BadRequestException('Account not found');
    if (dto.contactId && !results.shift())
      throw new BadRequestException('Contact not found');
    if (dto.opportunityId && !results.shift())
      throw new BadRequestException('Opportunity not found');
  }

  async create(dto: CreateTaskDto, actorUserId: string) {
    await this.ensureRelationsExist(dto);

    const isDone = dto.status === TaskStatus.DONE;

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? TaskStatus.TODO,
        dueDate: dto.dueDate,
        completedAt: isDone ? new Date() : null,
        ownerId: actorUserId,
        leadId: dto.leadId,
        accountId: dto.accountId,
        contactId: dto.contactId,
        opportunityId: dto.opportunityId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'task.create',
      entityType: 'task',
      entityId: task.id,
      after: task,
    });

    return task;
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actorUserId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    await this.ensureRelationsExist(dto);

    let completedAt: Date | null | undefined = undefined;
    if (dto.status) {
      if (dto.status === TaskStatus.DONE) {
        completedAt = existing.completedAt ?? new Date();
      } else {
        completedAt = null;
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        dueDate: dto.dueDate,
        completedAt,
        leadId: dto.leadId,
        accountId: dto.accountId,
        contactId: dto.contactId,
        opportunityId: dto.opportunityId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'task.update',
      entityType: 'task',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    await this.prisma.task.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'task.delete',
      entityType: 'task',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }
}
