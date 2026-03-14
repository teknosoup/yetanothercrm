import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query';

export type AuditPayload = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitize(
    value: unknown,
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    if (value == null) return Prisma.JsonNull;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'bigint') return value.toString();
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitize(v)) as Prisma.InputJsonArray;
    }
    if (typeof value !== 'object') {
      if (typeof value === 'symbol') return value.toString();
      if (typeof value === 'function') return '[Function]';
      return '';
    }

    const record = value as Record<string, unknown>;
    const out: Record<
      string,
      Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue
    > = {};
    for (const [key, val] of Object.entries(record)) {
      if (key === 'passwordHash' || key === 'tokenHash') {
        out[key] = '[REDACTED]';
        continue;
      }
      out[key] = this.sanitize(val);
    }
    return out as Prisma.InputJsonValue;
  }

  async log(payload: AuditPayload) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: payload.actorUserId ?? null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        before:
          payload.before != null ? this.sanitize(payload.before) : undefined,
        after: payload.after != null ? this.sanitize(payload.after) : undefined,
        ip: payload.ip ?? null,
        userAgent: payload.userAgent ?? null,
      },
    });
  }

  async list(query: ListAuditLogsQuery) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const where = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action
        ? { action: { contains: query.action, mode: 'insensitive' as const } }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          actorUser: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
    ]);

    const sanitized = data.map((d) => ({
      ...d,
      before: d.before != null ? this.sanitize(d.before) : null,
      after: d.after != null ? this.sanitize(d.after) : null,
    }));

    return { total, data: sanitized, skip, take };
  }
}
