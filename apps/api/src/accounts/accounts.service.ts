import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ListAccountsQuery } from './dto/list-accounts.query';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListAccountsQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.account.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  private buildWhere(query: ListAccountsQuery): Prisma.AccountWhereInput {
    return {
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.q
        ? {
            OR: [
              { companyName: { contains: query.q, mode: 'insensitive' } },
              { industry: { contains: query.q, mode: 'insensitive' } },
              { segment: { contains: query.q, mode: 'insensitive' } },
              { type: { contains: query.q, mode: 'insensitive' } },
              { taxId: { contains: query.q, mode: 'insensitive' } },
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
      'companyName',
      'type',
      'segment',
      'industry',
      'address',
      'taxId',
      'status',
      'annualValueEstimate',
      'notes',
    ];
    return this.toCsv(headers, []);
  }

  async exportCsv(query: ListAccountsQuery) {
    const where = this.buildWhere(query);
    const take = Math.min(query.take ?? 5000, 5000);
    const skip = query.skip ?? 0;

    const rows = await this.prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        companyName: true,
        type: true,
        segment: true,
        industry: true,
        address: true,
        taxId: true,
        status: true,
        annualValueEstimate: true,
        notes: true,
        ownerId: true,
        createdAt: true,
      },
    });

    const headers = [
      'id',
      'companyName',
      'type',
      'segment',
      'industry',
      'address',
      'taxId',
      'status',
      'annualValueEstimate',
      'notes',
      'ownerId',
      'createdAt',
    ];

    return this.toCsv(headers, rows);
  }

  async create(dto: CreateAccountDto, actorUserId: string) {
    const account = await this.prisma.account.create({
      data: {
        companyName: dto.companyName,
        type: dto.type,
        segment: dto.segment,
        industry: dto.industry,
        address: dto.address,
        taxId: dto.taxId,
        status: dto.status ?? 'ACTIVE',
        annualValueEstimate: dto.annualValueEstimate,
        notes: dto.notes,
        ownerId: actorUserId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'account.create',
      entityType: 'account',
      entityId: account.id,
      after: account,
    });

    return account;
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async findRelations(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        contacts: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        opportunities: {
          select: {
            id: true,
            opportunityName: true,
            stage: true,
            estimatedValue: true,
            probability: true,
          },
        },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async update(id: string, dto: UpdateAccountDto, actorUserId: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Account not found');

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        companyName: dto.companyName,
        type: dto.type,
        segment: dto.segment,
        industry: dto.industry,
        address: dto.address,
        taxId: dto.taxId,
        status: dto.status,
        annualValueEstimate: dto.annualValueEstimate,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'account.update',
      entityType: 'account',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Account not found');

    await this.prisma.account.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'account.delete',
      entityType: 'account',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }
}
