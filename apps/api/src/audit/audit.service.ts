import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
