import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, OpportunityStage, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQuery } from './dto/list-leads.query';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListLeadsQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
              { companyName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async create(dto: CreateLeadDto, actorUserId: string) {
    const lead = await this.prisma.lead.create({
      data: {
        fullName: dto.fullName,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        industry: dto.industry,
        region: dto.region,
        score: dto.score,
        notes: dto.notes,
        ownerId: actorUserId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'lead.create',
      entityType: 'lead',
      entityId: lead.id,
      after: lead,
    });

    return lead;
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, actorUserId: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        industry: dto.industry,
        region: dto.region,
        status: dto.status,
        score: dto.score,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'lead.update',
      entityType: 'lead',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');

    await this.prisma.lead.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'lead.delete',
      entityType: 'lead',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }

  async convert(id: string, actorUserId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead already converted');
    }

    const companyName =
      lead.companyName?.trim() ||
      (lead.fullName.trim() ? `${lead.fullName.trim()} Company` : null);
    if (!companyName) throw new BadRequestException('Company name is required');

    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          companyName,
          industry: lead.industry,
          ownerId: actorUserId,
        },
      });

      const contact = await tx.contact.create({
        data: {
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          ownerId: actorUserId,
          accountId: account.id,
        },
      });

      const opportunity = await tx.opportunity.create({
        data: {
          opportunityName: `${companyName} - Opportunity`,
          stage: OpportunityStage.PROSPECTING,
          ownerId: actorUserId,
          accountId: account.id,
          contactId: contact.id,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.CONVERTED },
      });

      return { account, contact, opportunity, updatedLead };
    });

    await this.auditService.log({
      actorUserId,
      action: 'lead.convert',
      entityType: 'lead',
      entityId: lead.id,
      before: lead,
      after: result.updatedLead,
    });

    return {
      leadId: lead.id,
      accountId: result.account.id,
      contactId: result.contact.id,
      opportunityId: result.opportunity.id,
    };
  }
}
