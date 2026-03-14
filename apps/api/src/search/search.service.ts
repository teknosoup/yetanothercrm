import { Injectable } from '@nestjs/common';
import type { Activity, Lead, Note, Opportunity, Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/auth/request-user';
import { GlobalSearchQuery } from './dto/global-search.query';

type SearchEntity =
  | 'lead'
  | 'account'
  | 'contact'
  | 'opportunity'
  | 'task'
  | 'activity'
  | 'note';

type SearchResultItem = {
  entityType: SearchEntity;
  id: string;
  title: string;
  subtitle: string | null;
  occurredAt: string | null;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  private async permissionKeysForRole(roleId: string) {
    const roleWithPermissions = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        rolePermissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });

    return new Set(
      roleWithPermissions?.rolePermissions.map((rp) => rp.permission.key) ?? [],
    );
  }

  private parseEntities(raw: string | undefined): Set<SearchEntity> | null {
    if (!raw) return null;
    const parts = raw
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return null;

    const allowed: SearchEntity[] = [
      'lead',
      'account',
      'contact',
      'opportunity',
      'task',
      'activity',
      'note',
    ];
    const allowedSet = new Set(allowed);
    const requested = new Set<SearchEntity>();
    for (const p of parts) {
      if (allowedSet.has(p as SearchEntity)) requested.add(p as SearchEntity);
    }
    return requested.size === 0 ? null : requested;
  }

  async search(query: GlobalSearchQuery, user: RequestUser) {
    const q = query.q.trim();
    const take = query.take ?? 5;
    const requestedEntities = this.parseEntities(query.entities);

    const permissionKeys = await this.permissionKeysForRole(user.roleId);

    const shouldSearch = (entity: SearchEntity, requiredPermission: string) => {
      if (!permissionKeys.has(requiredPermission)) return false;
      if (!requestedEntities) return true;
      return requestedEntities.has(entity);
    };

    const tasks: Array<
      Promise<{ entity: SearchEntity; items: SearchResultItem[] }>
    > = [];

    if (shouldSearch('lead', 'lead.read')) {
      tasks.push(
        this.prisma.lead
          .findMany({
            where: {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { companyName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { source: { contains: q, mode: 'insensitive' } },
                { industry: { contains: q, mode: 'insensitive' } },
                { region: { contains: q, mode: 'insensitive' } },
              ],
            },
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              fullName: true,
              companyName: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          })
          .then((rows) => ({
            entity: 'lead' as const,
            items: rows.map(
              (
                r: Pick<
                  Lead,
                  | 'id'
                  | 'fullName'
                  | 'companyName'
                  | 'email'
                  | 'phone'
                  | 'createdAt'
                >,
              ) => ({
                entityType: 'lead',
                id: r.id,
                title: r.fullName,
                subtitle: r.companyName ?? r.email ?? r.phone ?? null,
                occurredAt: r.createdAt.toISOString(),
              }),
            ),
          })),
      );
    }

    if (shouldSearch('account', 'account.read')) {
      tasks.push(
        this.prisma.account
          .findMany({
            where: {
              OR: [
                { companyName: { contains: q, mode: 'insensitive' } },
                { industry: { contains: q, mode: 'insensitive' } },
                { address: { contains: q, mode: 'insensitive' } },
                { taxId: { contains: q, mode: 'insensitive' } },
                { notes: { contains: q, mode: 'insensitive' } },
              ],
            },
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              companyName: true,
              industry: true,
              createdAt: true,
            },
          })
          .then((rows) => ({
            entity: 'account' as const,
            items: rows.map((r) => ({
              entityType: 'account',
              id: r.id,
              title: r.companyName,
              subtitle: r.industry ?? null,
              occurredAt: r.createdAt.toISOString(),
            })),
          })),
      );
    }

    if (shouldSearch('contact', 'contact.read')) {
      tasks.push(
        this.prisma.contact
          .findMany({
            where: {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { jobTitle: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            },
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              fullName: true,
              jobTitle: true,
              email: true,
              createdAt: true,
            },
          })
          .then((rows) => ({
            entity: 'contact' as const,
            items: rows.map((r) => ({
              entityType: 'contact',
              id: r.id,
              title: r.fullName,
              subtitle: r.jobTitle ?? r.email ?? null,
              occurredAt: r.createdAt.toISOString(),
            })),
          })),
      );
    }

    if (shouldSearch('opportunity', 'opportunity.read')) {
      tasks.push(
        this.prisma.opportunity
          .findMany({
            where: {
              OR: [
                { opportunityName: { contains: q, mode: 'insensitive' } },
                { lostReason: { contains: q, mode: 'insensitive' } },
              ],
            },
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              opportunityName: true,
              stage: true,
              createdAt: true,
            },
          })
          .then((rows) => ({
            entity: 'opportunity' as const,
            items: rows.map(
              (
                r: Pick<
                  Opportunity,
                  'id' | 'opportunityName' | 'stage' | 'createdAt'
                >,
              ) => ({
                entityType: 'opportunity',
                id: r.id,
                title: r.opportunityName,
                subtitle: String(r.stage),
                occurredAt: r.createdAt.toISOString(),
              }),
            ),
          })),
      );
    }

    if (shouldSearch('task', 'task.read')) {
      tasks.push(
        this.prisma.task
          .findMany({
            where: {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              createdAt: true,
            },
          })
          .then((rows) => ({
            entity: 'task' as const,
            items: rows.map(
              (
                r: Pick<
                  Task,
                  'id' | 'title' | 'status' | 'dueDate' | 'createdAt'
                >,
              ) => ({
                entityType: 'task',
                id: r.id,
                title: r.title,
                subtitle: r.dueDate
                  ? `${String(r.status)} • due ${r.dueDate.toISOString()}`
                  : String(r.status),
                occurredAt: r.createdAt.toISOString(),
              }),
            ),
          })),
      );
    }

    if (shouldSearch('activity', 'activity.read')) {
      tasks.push(
        this.prisma.activity
          .findMany({
            where: {
              OR: [
                { subject: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            take,
            orderBy: { occurredAt: 'desc' },
            select: {
              id: true,
              type: true,
              subject: true,
              occurredAt: true,
            },
          })
          .then((rows) => ({
            entity: 'activity' as const,
            items: rows.map(
              (
                r: Pick<Activity, 'id' | 'type' | 'subject' | 'occurredAt'>,
              ) => ({
                entityType: 'activity',
                id: r.id,
                title: r.subject,
                subtitle: String(r.type),
                occurredAt: r.occurredAt.toISOString(),
              }),
            ),
          })),
      );
    }

    if (shouldSearch('note', 'note.read')) {
      tasks.push(
        this.prisma.note
          .findMany({
            where: {
              body: { contains: q, mode: 'insensitive' },
            },
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              entityType: true,
              entityId: true,
              body: true,
              createdAt: true,
            },
          })
          .then((rows) => ({
            entity: 'note' as const,
            items: rows.map(
              (
                r: Pick<Note, 'id' | 'body' | 'createdAt'> & {
                  entityType: string;
                  entityId: string;
                },
              ) => ({
                entityType: 'note',
                id: r.id,
                title:
                  r.body.length > 120 ? `${r.body.slice(0, 120)}…` : r.body,
                subtitle: `${r.entityType}:${r.entityId}`,
                occurredAt: r.createdAt.toISOString(),
              }),
            ),
          })),
      );
    }

    const results = await Promise.all(tasks);
    const byEntity = new Map<SearchEntity, SearchResultItem[]>();
    for (const r of results) byEntity.set(r.entity, r.items);

    return {
      q,
      takePerEntity: take,
      results: {
        leads: byEntity.get('lead') ?? [],
        accounts: byEntity.get('account') ?? [],
        contacts: byEntity.get('contact') ?? [],
        opportunities: byEntity.get('opportunity') ?? [],
        tasks: byEntity.get('task') ?? [],
        activities: byEntity.get('activity') ?? [],
        notes: byEntity.get('note') ?? [],
      },
    };
  }
}
