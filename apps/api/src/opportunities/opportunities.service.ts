import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpportunityStage, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { ListOpportunitiesQuery } from './dto/list-opportunities.query';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private weightedValue(
    estimatedValue: number | null,
    probability: number | null,
  ) {
    if (!estimatedValue || !probability) return 0;
    return estimatedValue * (probability / 100);
  }

  async list(query: ListOpportunitiesQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where: Prisma.OpportunityWhereInput = {
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.q
        ? {
            OR: [
              { opportunityName: { contains: query.q, mode: 'insensitive' } },
              { lostReason: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          account: { select: { id: true, companyName: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        ...o,
        weightedValue: this.weightedValue(o.estimatedValue, o.probability),
      })),
      total,
      skip,
      take,
    };
  }

  async create(dto: CreateOpportunityDto, actorUserId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
      select: { id: true },
    });
    if (!account) throw new BadRequestException('Account not found');

    if (dto.contactId) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: dto.contactId },
        select: { id: true },
      });
      if (!contact) throw new BadRequestException('Contact not found');
    }

    const opportunity = await this.prisma.opportunity.create({
      data: {
        opportunityName: dto.opportunityName,
        stage: dto.stage ?? OpportunityStage.PROSPECTING,
        estimatedValue: dto.estimatedValue,
        probability: dto.probability,
        expectedCloseDate: dto.expectedCloseDate,
        ownerId: actorUserId,
        accountId: dto.accountId,
        contactId: dto.contactId,
      },
    });

    await this.prisma.opportunityStageHistory.create({
      data: {
        opportunityId: opportunity.id,
        fromStage: null,
        toStage: opportunity.stage,
        actorUserId,
        note: 'created',
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'opportunity.create',
      entityType: 'opportunity',
      entityId: opportunity.id,
      after: opportunity,
    });

    return opportunity;
  }

  async findOne(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return {
      ...opportunity,
      weightedValue: this.weightedValue(
        opportunity.estimatedValue,
        opportunity.probability,
      ),
    };
  }

  async update(id: string, dto: UpdateOpportunityDto, actorUserId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: dto.accountId },
        select: { id: true },
      });
      if (!account) throw new BadRequestException('Account not found');
    }

    if (dto.contactId) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: dto.contactId },
        select: { id: true },
      });
      if (!contact) throw new BadRequestException('Contact not found');
    }

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        opportunityName: dto.opportunityName,
        accountId: dto.accountId,
        contactId: dto.contactId,
        estimatedValue: dto.estimatedValue,
        probability: dto.probability,
        expectedCloseDate: dto.expectedCloseDate,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'opportunity.update',
      entityType: 'opportunity',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async changeStage(id: string, dto: ChangeStageDto, actorUserId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    if (dto.stage === OpportunityStage.CLOSED_LOST && !dto.lostReason) {
      throw new BadRequestException('lostReason is required for CLOSED_LOST');
    }

    const now = new Date();

    const patch: Prisma.OpportunityUpdateInput = {
      stage: dto.stage,
      lostReason:
        dto.stage === OpportunityStage.CLOSED_LOST ? dto.lostReason : null,
      wonDate: dto.stage === OpportunityStage.CLOSED_WON ? now : null,
      closedDate:
        dto.stage === OpportunityStage.CLOSED_WON ||
        dto.stage === OpportunityStage.CLOSED_LOST
          ? now
          : null,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOpp = await tx.opportunity.update({
        where: { id },
        data: patch,
      });
      await tx.opportunityStageHistory.create({
        data: {
          opportunityId: id,
          fromStage: existing.stage,
          toStage: dto.stage,
          actorUserId,
          note: dto.note,
        },
      });
      return updatedOpp;
    });

    await this.auditService.log({
      actorUserId,
      action: 'opportunity.stage_change',
      entityType: 'opportunity',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async stageHistory(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const items = await this.prisma.opportunityStageHistory.findMany({
      where: { opportunityId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { items };
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');

    await this.prisma.opportunity.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'opportunity.delete',
      entityType: 'opportunity',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }
}
