import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ListActivitiesQuery } from './dto/list-activities.query';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListActivitiesQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where: Prisma.ActivityWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.opportunityId ? { opportunityId: query.opportunityId } : {}),
      ...(query.q
        ? {
            OR: [
              { subject: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { items, total, skip, take };
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

  async create(dto: CreateActivityDto, actorUserId: string) {
    await this.ensureRelationsExist(dto);

    const activity = await this.prisma.activity.create({
      data: {
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        occurredAt: dto.occurredAt ?? new Date(),
        ownerId: actorUserId,
        leadId: dto.leadId,
        accountId: dto.accountId,
        contactId: dto.contactId,
        opportunityId: dto.opportunityId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'activity.create',
      entityType: 'activity',
      entityId: activity.id,
      after: activity,
    });

    return activity;
  }

  async findOne(id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async update(id: string, dto: UpdateActivityDto, actorUserId: string) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Activity not found');

    await this.ensureRelationsExist(dto);

    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        occurredAt: dto.occurredAt,
        leadId: dto.leadId,
        accountId: dto.accountId,
        contactId: dto.contactId,
        opportunityId: dto.opportunityId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'activity.update',
      entityType: 'activity',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Activity not found');

    await this.prisma.activity.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'activity.delete',
      entityType: 'activity',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }
}
