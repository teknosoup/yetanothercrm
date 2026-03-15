import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { Subscription } from 'rxjs';
import { NotificationsModule } from '../notifications/notifications.module';
import { PluginsController } from './plugins.controller';
import type { PluginContext } from './plugins.service';
import { PluginsService } from './plugins.service';

type LeadAssignmentConfig = {
  mode?: 'round_robin' | 'by_region' | 'by_source';
  eligibleOwnerIds?: string[];
  regionOwners?: Record<string, string[]>;
  sourceOwners?: Record<string, string[]>;
  defaultOwnerId?: string;
  fallbackToCreator?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseLeadAssignmentConfig = (value: unknown): LeadAssignmentConfig => {
  if (!isRecord(value)) return {};

  const eligibleOwnerIds = Array.isArray(value.eligibleOwnerIds)
    ? value.eligibleOwnerIds.filter((v): v is string => typeof v === 'string')
    : undefined;

  const regionOwners = isRecord(value.regionOwners)
    ? Object.fromEntries(
        Object.entries(value.regionOwners).map(([k, v]) => [
          k,
          Array.isArray(v)
            ? v.filter((x): x is string => typeof x === 'string')
            : [],
        ]),
      )
    : undefined;

  const sourceOwners = isRecord(value.sourceOwners)
    ? Object.fromEntries(
        Object.entries(value.sourceOwners).map(([k, v]) => [
          k,
          Array.isArray(v)
            ? v.filter((x): x is string => typeof x === 'string')
            : [],
        ]),
      )
    : undefined;

  const modeRaw = value.mode;
  const mode =
    modeRaw === 'round_robin' ||
    modeRaw === 'by_region' ||
    modeRaw === 'by_source'
      ? modeRaw
      : undefined;

  const defaultOwnerId =
    typeof value.defaultOwnerId === 'string' ? value.defaultOwnerId : undefined;

  const fallbackToCreator =
    typeof value.fallbackToCreator === 'boolean'
      ? value.fallbackToCreator
      : undefined;

  return {
    mode,
    eligibleOwnerIds,
    regionOwners,
    sourceOwners,
    defaultOwnerId,
    fallbackToCreator,
  };
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const pickLeastLoadedOwner = async (ctx: PluginContext, ownerIds: string[]) => {
  const activeOwners = await ctx.prisma.user.findMany({
    where: { id: { in: ownerIds }, isActive: true },
    select: { id: true },
  });
  const activeOwnerIds = activeOwners.map((u) => u.id);
  if (activeOwnerIds.length === 0) return null;

  const counts = await ctx.prisma.lead.groupBy({
    by: ['ownerId'],
    where: {
      ownerId: { in: activeOwnerIds },
      status: { not: LeadStatus.CONVERTED },
    },
    _count: { _all: true },
  });
  const countByOwnerId = new Map(
    counts.map((c) => [c.ownerId, c._count._all ?? 0]),
  );

  let bestOwnerId = activeOwnerIds[0];
  let bestCount = countByOwnerId.get(bestOwnerId) ?? 0;
  for (const candidateId of activeOwnerIds.slice(1)) {
    const candidateCount = countByOwnerId.get(candidateId) ?? 0;
    if (candidateCount < bestCount) {
      bestOwnerId = candidateId;
      bestCount = candidateCount;
    }
  }
  return bestOwnerId;
};

const computeCandidateOwnerIds = async (
  ctx: PluginContext,
  config: LeadAssignmentConfig,
  lead: { region: string | null; source: string | null; ownerId: string },
) => {
  const mode = config.mode ?? 'round_robin';

  if (mode === 'by_region') {
    const region = lead.region?.trim();
    const direct = region ? config.regionOwners?.[region] : undefined;
    const fallback = config.regionOwners?.['*'];
    const chosen = direct?.length
      ? direct
      : fallback?.length
        ? fallback
        : undefined;
    const candidate = chosen?.length
      ? chosen
      : config.eligibleOwnerIds?.length
        ? config.eligibleOwnerIds
        : [];
    return uniqueStrings(candidate);
  }

  if (mode === 'by_source') {
    const source = lead.source?.trim();
    const direct = source ? config.sourceOwners?.[source] : undefined;
    const fallback = config.sourceOwners?.['*'];
    const chosen = direct?.length
      ? direct
      : fallback?.length
        ? fallback
        : undefined;
    const candidate = chosen?.length
      ? chosen
      : config.eligibleOwnerIds?.length
        ? config.eligibleOwnerIds
        : [];
    return uniqueStrings(candidate);
  }

  if (config.eligibleOwnerIds?.length)
    return uniqueStrings(config.eligibleOwnerIds);

  const salesRole = await ctx.prisma.role.findUnique({
    where: { name: 'Sales' },
    select: { id: true },
  });
  if (!salesRole) return [];

  const salesUsers = await ctx.prisma.user.findMany({
    where: { roleId: salesRole.id, isActive: true },
    select: { id: true },
  });
  return salesUsers.map((u) => u.id);
};

@Injectable()
class BuiltinPluginsRegistrar implements OnModuleInit {
  private leadAssignmentSub: Subscription | null = null;

  constructor(private readonly pluginsService: PluginsService) {}

  async onModuleInit() {
    await this.pluginsService.register({
      key: 'lead-assignment-rules',
      name: 'Lead Assignment Rules',
      version: '1.0.0',
      onActivate: (ctx) => {
        if (this.leadAssignmentSub) return;

        this.leadAssignmentSub = ctx.eventBus
          .on('lead.created')
          .subscribe((e) => {
            void (async () => {
              if (!e.entityId) return;

              const lead = await ctx.prisma.lead.findUnique({
                where: { id: e.entityId },
                select: {
                  id: true,
                  fullName: true,
                  companyName: true,
                  region: true,
                  source: true,
                  ownerId: true,
                },
              });
              if (!lead) return;

              const pluginRow = await ctx.prisma.plugin.findUnique({
                where: { key: 'lead-assignment-rules' },
                select: { config: true },
              });
              const config = parseLeadAssignmentConfig(pluginRow?.config);

              const ownerIds = await computeCandidateOwnerIds(
                ctx,
                config,
                lead,
              );
              const candidateOwnerIds =
                ownerIds.length > 0
                  ? ownerIds
                  : config.defaultOwnerId
                    ? [config.defaultOwnerId]
                    : config.fallbackToCreator === false
                      ? []
                      : [lead.ownerId];
              if (candidateOwnerIds.length === 0) return;

              const nextOwnerId = await pickLeastLoadedOwner(
                ctx,
                candidateOwnerIds,
              );
              if (!nextOwnerId) return;
              if (nextOwnerId === lead.ownerId) return;

              const updated = await ctx.prisma.lead.update({
                where: { id: lead.id },
                data: { ownerId: nextOwnerId },
              });

              const actorUserId = e.actorUserId ?? null;

              await ctx.auditService.log({
                actorUserId,
                action: 'lead.auto_assign',
                entityType: 'lead',
                entityId: lead.id,
                before: lead,
                after: updated,
              });

              ctx.eventBus.emit({
                type: 'lead.assigned',
                actorUserId,
                entityType: 'lead',
                entityId: lead.id,
                payload: {
                  fromOwnerId: lead.ownerId,
                  toOwnerId: updated.ownerId,
                  assignedBy: 'plugin:lead-assignment-rules',
                },
              });

              if (!actorUserId || updated.ownerId !== actorUserId) {
                await ctx.notificationsService.createNotification({
                  recipientUserId: updated.ownerId,
                  type: 'lead.assigned',
                  title: `Lead assigned: ${lead.fullName}`,
                  body: lead.companyName
                    ? `Company: ${lead.companyName}`
                    : null,
                  entityType: 'lead',
                  entityId: lead.id,
                  dedupeKey: `lead.assigned:${lead.id}:${updated.ownerId}`,
                });
              }
            })();
          });
      },
      onDeactivate: () => {
        this.leadAssignmentSub?.unsubscribe();
        this.leadAssignmentSub = null;
      },
    });
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [PluginsController],
  providers: [PluginsService, BuiltinPluginsRegistrar],
  exports: [PluginsService],
})
export class PluginsModule {}
