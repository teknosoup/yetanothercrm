import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldEntityType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ListAccountsQuery } from './dto/list-accounts.query';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly customFieldsService: CustomFieldsService,
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
      const companyName = this.getString(row.data, 'companyName');
      if (!companyName) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'companyName is required',
          data: row.data,
        });
        continue;
      }

      let annualValueEstimate: number | undefined;
      try {
        annualValueEstimate = this.getInt(row.data, 'annualValueEstimate');
      } catch (e) {
        errors.push({
          rowNumber: row.rowNumber,
          message:
            e instanceof Error ? e.message : 'Invalid annualValueEstimate',
          data: row.data,
        });
        continue;
      }

      if (dryRun) continue;

      try {
        const created = await this.prisma.account.create({
          data: {
            companyName,
            type: this.getString(row.data, 'type'),
            segment: this.getString(row.data, 'segment'),
            industry: this.getString(row.data, 'industry'),
            address: this.getString(row.data, 'address'),
            taxId: this.getString(row.data, 'taxId'),
            status: this.getString(row.data, 'status') ?? 'ACTIVE',
            annualValueEstimate,
            notes: this.getString(row.data, 'notes'),
            ownerId: actorUserId,
          },
        });

        await this.auditService.log({
          actorUserId,
          action: 'account.import',
          entityType: 'account',
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
    const accountWithCustomFields = await this.prisma.$transaction(
      async (tx) => {
        const account = await tx.account.create({
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

        await this.customFieldsService.writeValues({
          db: tx,
          entityType: CustomFieldEntityType.ACCOUNT,
          entityId: account.id,
          customFields: dto.customFields,
          requireAllRequired: true,
        });

        const customFields = await this.customFieldsService.getValuesMap(
          tx,
          CustomFieldEntityType.ACCOUNT,
          account.id,
        );

        return { ...account, customFields };
      },
    );

    await this.auditService.log({
      actorUserId,
      action: 'account.create',
      entityType: 'account',
      entityId: accountWithCustomFields.id,
      after: accountWithCustomFields,
    });

    this.eventBus.emit({
      type: 'account.created',
      actorUserId,
      entityType: 'account',
      entityId: accountWithCustomFields.id,
      payload: { after: accountWithCustomFields },
    });

    return accountWithCustomFields;
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    const customFields = await this.customFieldsService.getValuesMap(
      this.prisma,
      CustomFieldEntityType.ACCOUNT,
      id,
    );
    return { ...account, customFields };
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

    const beforeCustomFields = await this.customFieldsService.getValuesMap(
      this.prisma,
      CustomFieldEntityType.ACCOUNT,
      id,
    );

    const updatedWithCustomFields = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.account.update({
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

        await this.customFieldsService.writeValues({
          db: tx,
          entityType: CustomFieldEntityType.ACCOUNT,
          entityId: id,
          customFields: dto.customFields,
          requireAllRequired: false,
        });

        const customFields = await this.customFieldsService.getValuesMap(
          tx,
          CustomFieldEntityType.ACCOUNT,
          id,
        );

        return { ...updated, customFields };
      },
    );

    await this.auditService.log({
      actorUserId,
      action: 'account.update',
      entityType: 'account',
      entityId: updatedWithCustomFields.id,
      before: { ...existing, customFields: beforeCustomFields },
      after: updatedWithCustomFields,
    });

    this.eventBus.emit({
      type: 'account.updated',
      actorUserId,
      entityType: 'account',
      entityId: updatedWithCustomFields.id,
      payload: { before: existing, after: updatedWithCustomFields },
    });

    return updatedWithCustomFields;
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

    this.eventBus.emit({
      type: 'account.deleted',
      actorUserId,
      entityType: 'account',
      entityId: existing.id,
      payload: { before: existing },
    });

    return { id };
  }
}
