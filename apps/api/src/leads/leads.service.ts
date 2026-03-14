import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Lead, LeadStatus, OpportunityStage, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQuery } from './dto/list-leads.query';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(query: ListLeadsQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where = this.buildWhere(query);

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

  private buildWhere(query: ListLeadsQuery): Prisma.LeadWhereInput {
    return {
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
  }

  private escapeCsvValue(value: unknown) {
    if (value == null) return '';
    const raw =
      value instanceof Date
        ? value.toISOString()
        : typeof value === 'string'
          ? value
          : typeof value === 'number' ||
              typeof value === 'boolean' ||
              typeof value === 'bigint'
            ? String(value)
            : JSON.stringify(value);
    const escaped = raw.replace(/"/g, '""');
    if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
    return escaped;
  }

  private toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
    const headerLine = headers.join(',');
    const lines = rows.map((row) =>
      headers.map((h) => this.escapeCsvValue(row[h])).join(','),
    );
    return [headerLine, ...lines].join('\r\n');
  }

  importTemplateCsv() {
    const headers = [
      'fullName',
      'companyName',
      'email',
      'phone',
      'source',
      'industry',
      'region',
      'score',
      'notes',
    ];
    return this.toCsv(headers, []);
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          const next = text[i + 1];
          if (next === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        continue;
      }

      if (ch === ',') {
        row.push(field);
        field = '';
        continue;
      }

      if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        continue;
      }

      if (ch === '\r') continue;
      field += ch;
    }

    row.push(field);
    const hasAnyValue = row.some((v) => v.trim() !== '');
    if (hasAnyValue) rows.push(row);

    while (
      rows.length > 0 &&
      rows[rows.length - 1].every((v) => v.trim() === '')
    ) {
      rows.pop();
    }

    return rows;
  }

  private parseImportFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Array<{ rowNumber: number; data: Record<string, string> }> {
    const nameLower = file.originalname.toLowerCase();
    const isCsv = nameLower.endsWith('.csv') || file.mimetype.includes('csv');

    if (!isCsv) {
      throw new BadRequestException('Unsupported file type (CSV only)');
    }

    const text = file.buffer.toString('utf8');
    const table = this.parseCsv(text);
    if (table.length === 0) return [];
    const headers = table[0].map((h) => h.trim());
    return table.slice(1).map((cells, idx) => {
      const data: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        if (!key) continue;
        data[key] = (cells[i] ?? '').trim();
      }
      return { rowNumber: idx + 2, data };
    });
  }

  private getString(row: Record<string, string>, key: string) {
    const raw = row[key];
    if (raw == null) return undefined;
    const value = String(raw).trim();
    if (value === '') return undefined;
    return value;
  }

  private getInt(row: Record<string, string>, key: string) {
    const str = this.getString(row, key);
    if (str == null) return undefined;
    const n = Number.parseInt(str, 10);
    if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${key}`);
    return n;
  }

  async importFile(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    actorUserId: string,
    dryRun: boolean,
  ) {
    const rows = this.parseImportFile(file);
    const maxRows = 5000;
    if (rows.length > maxRows) {
      throw new BadRequestException(`Too many rows (max ${maxRows})`);
    }

    const errors: Array<{
      rowNumber: number;
      message: string;
      data: Record<string, string>;
    }> = [];
    const createdIds: string[] = [];

    for (const row of rows) {
      const fullName = this.getString(row.data, 'fullName');
      if (!fullName) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'fullName is required',
          data: row.data,
        });
        continue;
      }

      let score: number | undefined;
      try {
        score = this.getInt(row.data, 'score');
      } catch (e) {
        errors.push({
          rowNumber: row.rowNumber,
          message: e instanceof Error ? e.message : 'Invalid score',
          data: row.data,
        });
        continue;
      }

      if (dryRun) continue;

      try {
        const created = await this.prisma.lead.create({
          data: {
            fullName,
            companyName: this.getString(row.data, 'companyName'),
            email: this.getString(row.data, 'email'),
            phone: this.getString(row.data, 'phone'),
            source: this.getString(row.data, 'source'),
            industry: this.getString(row.data, 'industry'),
            region: this.getString(row.data, 'region'),
            score,
            notes: this.getString(row.data, 'notes'),
            status: LeadStatus.NEW,
            ownerId: actorUserId,
          },
        });

        await this.auditService.log({
          actorUserId,
          action: 'lead.import',
          entityType: 'lead',
          entityId: created.id,
          after: created,
        });

        createdIds.push(created.id);
      } catch (e) {
        errors.push({
          rowNumber: row.rowNumber,
          message: e instanceof Error ? e.message : 'Failed to import row',
          data: row.data,
        });
      }
    }

    const totalRows = rows.length;
    const successCount = dryRun ? totalRows - errors.length : createdIds.length;
    return {
      dryRun,
      totalRows,
      successCount,
      failureCount: errors.length,
      createdIds,
      errors,
    };
  }

  async exportCsv(query: ListLeadsQuery) {
    const where = this.buildWhere(query);
    const take = Math.min(query.take ?? 5000, 5000);
    const skip = query.skip ?? 0;

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        companyName: true,
        email: true,
        phone: true,
        source: true,
        industry: true,
        region: true,
        status: true,
        score: true,
        ownerId: true,
        createdAt: true,
      },
    });

    const headers = [
      'id',
      'fullName',
      'companyName',
      'email',
      'phone',
      'source',
      'industry',
      'region',
      'status',
      'score',
      'ownerId',
      'createdAt',
    ];

    return this.toCsv(headers, rows);
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

    this.eventBus.emit({
      type: 'lead.created',
      actorUserId,
      entityType: 'lead',
      entityId: lead.id,
      payload: { ownerId: lead.ownerId },
    });

    return lead;
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async findDuplicates() {
    const emailGroups = await this.prisma.lead.groupBy({
      by: ['email'],
      where: { email: { not: null } },
      _count: { _all: true },
    });
    const emails = emailGroups
      .filter((g) => (g._count._all ?? 0) > 1)
      .map((g) => g.email)
      .filter((v): v is string => Boolean(v));

    const phoneGroups = await this.prisma.lead.groupBy({
      by: ['phone'],
      where: { phone: { not: null } },
      _count: { _all: true },
    });
    const phones = phoneGroups
      .filter((g) => (g._count._all ?? 0) > 1)
      .map((g) => g.phone)
      .filter((v): v is string => Boolean(v));

    const emailLeads: Lead[] = emails.length
      ? await this.prisma.lead.findMany({
          where: { email: { in: emails } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const phoneLeads: Lead[] = phones.length
      ? await this.prisma.lead.findMany({
          where: { phone: { in: phones } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const byEmail = new Map<string, typeof emailLeads>();
    for (const lead of emailLeads) {
      if (!lead.email) continue;
      const list = byEmail.get(lead.email) ?? [];
      list.push(lead);
      byEmail.set(lead.email, list);
    }

    const byPhone = new Map<string, typeof phoneLeads>();
    for (const lead of phoneLeads) {
      if (!lead.phone) continue;
      const list = byPhone.get(lead.phone) ?? [];
      list.push(lead);
      byPhone.set(lead.phone, list);
    }

    return {
      email: Array.from(byEmail.entries()).map(([key, leads]) => ({
        key,
        leadIds: leads.map((l) => l.id),
      })),
      phone: Array.from(byPhone.entries()).map(([key, leads]) => ({
        key,
        leadIds: leads.map((l) => l.id),
      })),
    };
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

    this.eventBus.emit({
      type: 'lead.updated',
      actorUserId,
      entityType: 'lead',
      entityId: updated.id,
      payload: { before: existing, after: updated },
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
        data: {
          status: LeadStatus.CONVERTED,
          convertedAccountId: account.id,
          convertedContactId: contact.id,
          convertedOpportunityId: opportunity.id,
          convertedAt: new Date(),
        },
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

    this.eventBus.emit({
      type: 'lead.converted',
      actorUserId,
      entityType: 'lead',
      entityId: lead.id,
      payload: {
        accountId: result.account.id,
        contactId: result.contact.id,
        opportunityId: result.opportunity.id,
      },
    });

    return {
      leadId: lead.id,
      accountId: result.account.id,
      contactId: result.contact.id,
      opportunityId: result.opportunity.id,
    };
  }

  async getConvertResult(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status !== LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead is not converted');
    }

    if (
      lead.convertedAccountId &&
      lead.convertedContactId &&
      lead.convertedOpportunityId
    ) {
      return {
        leadId: lead.id,
        accountId: lead.convertedAccountId,
        contactId: lead.convertedContactId,
        opportunityId: lead.convertedOpportunityId,
      };
    }

    const companyName =
      lead.companyName?.trim() ||
      (lead.fullName.trim() ? `${lead.fullName.trim()} Company` : null);
    if (!companyName) {
      throw new BadRequestException('Company name is required');
    }

    const updatedAt =
      lead.updatedAt instanceof Date
        ? lead.updatedAt
        : new Date(lead.updatedAt);
    const windowStart = new Date(updatedAt.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(updatedAt.getTime() + 2 * 60 * 60 * 1000);

    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        ownerId: lead.ownerId,
        opportunityName: `${companyName} - Opportunity`,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, accountId: true, contactId: true, createdAt: true },
    });

    if (!opportunity?.contactId) {
      throw new NotFoundException('Convert result not found');
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        convertedAccountId: opportunity.accountId,
        convertedContactId: opportunity.contactId,
        convertedOpportunityId: opportunity.id,
        convertedAt: lead.convertedAt ?? opportunity.createdAt,
      },
    });

    return {
      leadId: lead.id,
      accountId: opportunity.accountId,
      contactId: opportunity.contactId,
      opportunityId: opportunity.id,
    };
  }

  async assign(id: string, ownerId: string | undefined, actorUserId: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead not found');

    let nextOwnerId = ownerId;

    if (nextOwnerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: nextOwnerId },
        select: { id: true, isActive: true },
      });
      if (!user || !user.isActive) {
        throw new BadRequestException('Owner user not found or inactive');
      }
    } else {
      const salesRole = await this.prisma.role.findUnique({
        where: { name: 'Sales' },
        select: { id: true },
      });
      if (!salesRole) {
        throw new BadRequestException('Sales role not found');
      }

      const salesUsers = await this.prisma.user.findMany({
        where: { roleId: salesRole.id, isActive: true },
        select: { id: true },
      });
      if (salesUsers.length === 0) {
        throw new BadRequestException('No active sales users available');
      }

      const salesUserIds = salesUsers.map((u) => u.id);
      const leadCounts = await this.prisma.lead.groupBy({
        by: ['ownerId'],
        where: {
          ownerId: { in: salesUserIds },
          status: { not: LeadStatus.CONVERTED },
        },
        _count: { _all: true },
      });
      const countByOwnerId = new Map(
        leadCounts.map((row) => [row.ownerId, row._count._all]),
      );

      let bestOwnerId = salesUserIds[0];
      let bestCount = countByOwnerId.get(bestOwnerId) ?? 0;
      for (const candidateId of salesUserIds.slice(1)) {
        const candidateCount = countByOwnerId.get(candidateId) ?? 0;
        if (candidateCount < bestCount) {
          bestOwnerId = candidateId;
          bestCount = candidateCount;
        }
      }

      nextOwnerId = bestOwnerId;
    }

    if (existing.ownerId === nextOwnerId) return existing;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { ownerId: nextOwnerId },
    });

    await this.auditService.log({
      actorUserId,
      action: 'lead.assign',
      entityType: 'lead',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    this.eventBus.emit({
      type: 'lead.assigned',
      actorUserId,
      entityType: 'lead',
      entityId: updated.id,
      payload: { fromOwnerId: existing.ownerId, toOwnerId: updated.ownerId },
    });

    if (updated.ownerId !== actorUserId) {
      await this.notificationsService.createNotification({
        recipientUserId: updated.ownerId,
        type: 'lead.assigned',
        title: `Lead assigned: ${updated.fullName}`,
        body: updated.companyName ? `Company: ${updated.companyName}` : null,
        entityType: 'lead',
        entityId: updated.id,
        dedupeKey: `lead.assigned:${updated.id}:${updated.ownerId}`,
      });
    }

    return updated;
  }

  async merge(targetId: string, sourceLeadIds: string[], actorUserId: string) {
    const uniqueSourceIds = Array.from(
      new Set(sourceLeadIds.filter((id) => id !== targetId)),
    );
    if (uniqueSourceIds.length === 0) {
      throw new BadRequestException('No source leads to merge');
    }

    const [target, sources] = await Promise.all([
      this.prisma.lead.findUnique({ where: { id: targetId } }),
      this.prisma.lead.findMany({ where: { id: { in: uniqueSourceIds } } }),
    ]);
    if (!target) throw new NotFoundException('Lead not found');
    if (sources.length !== uniqueSourceIds.length) {
      throw new BadRequestException('Some source leads not found');
    }

    const pick = (values: Array<string | null | undefined>) =>
      values.map((v) => v?.trim()).find((v) => v && v.length > 0);

    const mergedData = {
      companyName:
        target.companyName ?? pick(sources.map((s) => s.companyName)) ?? null,
      email: target.email ?? pick(sources.map((s) => s.email)) ?? null,
      phone: target.phone ?? pick(sources.map((s) => s.phone)) ?? null,
      source: target.source ?? pick(sources.map((s) => s.source)) ?? null,
      industry: target.industry ?? pick(sources.map((s) => s.industry)) ?? null,
      region: target.region ?? pick(sources.map((s) => s.region)) ?? null,
      score:
        target.score ?? sources.find((s) => s.score != null)?.score ?? null,
      notes: target.notes ?? pick(sources.map((s) => s.notes)) ?? null,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: targetId },
        data: mergedData,
      });
      await tx.lead.deleteMany({ where: { id: { in: uniqueSourceIds } } });
      return updatedLead;
    });

    await this.auditService.log({
      actorUserId,
      action: 'lead.merge',
      entityType: 'lead',
      entityId: targetId,
      before: { target, sources },
      after: updated,
    });

    return updated;
  }
}
