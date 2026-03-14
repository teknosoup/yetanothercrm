import { Injectable } from '@nestjs/common';
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

  async log(payload: AuditPayload) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: payload.actorUserId ?? null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        before: payload.before ?? undefined,
        after: payload.after ?? undefined,
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

    return { total, data, skip, take };
  }
}
