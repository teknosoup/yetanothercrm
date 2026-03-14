import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQuery } from './dto/list-contacts.query';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListContactsQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  private buildWhere(query: ListContactsQuery): Prisma.ContactWhereInput {
    return {
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
              { jobTitle: { contains: query.q, mode: 'insensitive' } },
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
      'jobTitle',
      'email',
      'phone',
      'preferredChannel',
      'status',
      'accountId',
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

  private cellToString(value: unknown) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);
    if (value instanceof Date) return value.toISOString();
    return JSON.stringify(value);
  }

  private parseImportFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Array<{ rowNumber: number; data: Record<string, string> }> {
    const nameLower = file.originalname.toLowerCase();
    const isCsv = nameLower.endsWith('.csv') || file.mimetype.includes('csv');
    const isXlsx =
      nameLower.endsWith('.xlsx') ||
      nameLower.endsWith('.xls') ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel');

    if (!isCsv && !isXlsx) {
      throw new BadRequestException('Unsupported file type');
    }

    if (isCsv) {
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

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
    return rows.map((r, idx) => {
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(r)) {
        const header = key.trim();
        if (!header) continue;
        const str = this.cellToString(value).trim();
        data[header] = str;
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

    const accountIdsToCheck = new Set<string>();
    for (const row of rows) {
      const accountId = this.getString(row.data, 'accountId');
      if (accountId) accountIdsToCheck.add(accountId);
    }

    const existingAccountIds =
      accountIdsToCheck.size > 0
        ? new Set(
            (
              await this.prisma.account.findMany({
                where: { id: { in: Array.from(accountIdsToCheck) } },
                select: { id: true },
              })
            ).map((a) => a.id),
          )
        : new Set<string>();

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

      const accountId = this.getString(row.data, 'accountId');
      if (accountId && !existingAccountIds.has(accountId)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'Account not found',
          data: row.data,
        });
        continue;
      }

      if (dryRun) continue;

      try {
        const created = await this.prisma.contact.create({
          data: {
            fullName,
            jobTitle: this.getString(row.data, 'jobTitle'),
            email: this.getString(row.data, 'email'),
            phone: this.getString(row.data, 'phone'),
            preferredChannel: this.getString(row.data, 'preferredChannel'),
            status: this.getString(row.data, 'status') ?? 'ACTIVE',
            ownerId: actorUserId,
            accountId,
          },
        });

        await this.auditService.log({
          actorUserId,
          action: 'contact.import',
          entityType: 'contact',
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

  async exportCsv(query: ListContactsQuery) {
    const where = this.buildWhere(query);
    const take = Math.min(query.take ?? 5000, 5000);
    const skip = query.skip ?? 0;

    const rows = await this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        email: true,
        phone: true,
        preferredChannel: true,
        status: true,
        ownerId: true,
        accountId: true,
        createdAt: true,
      },
    });

    const headers = [
      'id',
      'fullName',
      'jobTitle',
      'email',
      'phone',
      'preferredChannel',
      'status',
      'ownerId',
      'accountId',
      'createdAt',
    ];

    return this.toCsv(headers, rows);
  }

  async create(dto: CreateContactDto, actorUserId: string) {
    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: dto.accountId },
        select: { id: true },
      });
      if (!account) throw new BadRequestException('Account not found');
    }

    const contact = await this.prisma.contact.create({
      data: {
        fullName: dto.fullName,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        preferredChannel: dto.preferredChannel,
        status: dto.status ?? 'ACTIVE',
        ownerId: actorUserId,
        accountId: dto.accountId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'contact.create',
      entityType: 'contact',
      entityId: contact.id,
      after: contact,
    });

    return contact;
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async history(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');

    const [activities, auditLogs] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where: { contactId: id },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'contact', entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return { contact, activities, auditLogs };
  }

  async update(id: string, dto: UpdateContactDto, actorUserId: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');

    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: dto.accountId },
        select: { id: true },
      });
      if (!account) throw new BadRequestException('Account not found');
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        preferredChannel: dto.preferredChannel,
        status: dto.status,
        accountId: dto.accountId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'contact.update',
      entityType: 'contact',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');

    await this.prisma.contact.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'contact.delete',
      entityType: 'contact',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }
}
