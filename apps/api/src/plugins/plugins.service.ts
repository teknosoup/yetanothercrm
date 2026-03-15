import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ListPluginsQuery } from './dto/list-plugins.query';
import { UpsertPluginDto } from './dto/upsert-plugin.dto';

export type PluginPermission = {
  key: string;
  description?: string;
};

export type PluginContext = {
  prisma: PrismaService;
  eventBus: EventBusService;
  auditService: AuditService;
  notificationsService: NotificationsService;
};

export type PluginHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type PluginHttpRequest = {
  method: PluginHttpMethod;
  path: string;
  body: unknown;
  query: Record<string, unknown>;
  actorUserId: string;
  roleId: string;
};

export type PluginEndpoint = {
  method: PluginHttpMethod;
  path: string;
  requiredPermissions?: string[];
  handler: (ctx: PluginContext, req: PluginHttpRequest) => Promise<unknown>;
};

export type CrmPlugin = {
  key: string;
  name: string;
  version?: string;
  permissions?: PluginPermission[];
  endpoints?: PluginEndpoint[];
  onActivate?: (ctx: PluginContext) => Promise<void> | void;
  onDeactivate?: (ctx: PluginContext) => Promise<void> | void;
};

@Injectable()
export class PluginsService implements OnModuleInit {
  private readonly logger = new Logger(PluginsService.name);
  private readonly registry = new Map<string, CrmPlugin>();
  private readonly active = new Set<string>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly reservedEndpointPaths = new Set(['activate', 'deactivate']);

  async onModuleInit() {
    try {
      const activePlugins = await this.prisma.plugin.findMany({
        where: { isActive: true },
        select: { key: true },
      });

      for (const row of activePlugins) {
        if (!this.registry.has(row.key)) {
          this.logger.warn(
            {
              type: 'plugin',
              action: 'bootstrap.skip',
              key: row.key,
              reason: 'not_registered',
            },
            'Plugins',
          );
          continue;
        }
        await this.activateRuntime(row.key);
      }
    } catch (error) {
      const maybe = error as { code?: string; meta?: unknown };
      if (maybe?.code === 'P2021') {
        this.logger.warn(
          {
            type: 'plugin',
            action: 'bootstrap.skip',
            reason: 'table_missing',
            meta: maybe.meta,
          },
          'Plugins',
        );
        return;
      }
      throw error;
    }
  }

  async list(query: ListPluginsQuery) {
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.plugin.findMany({
        orderBy: { key: 'asc' },
        skip,
        take,
      }),
      this.prisma.plugin.count(),
    ]);

    return { items, total, skip, take };
  }

  async upsert(key: string, dto: UpsertPluginDto) {
    return this.prisma.plugin.upsert({
      where: { key },
      update: {
        name: dto.name,
        version: dto.version,
        config: dto.config as never,
        ...(dto.isActive == null ? {} : { isActive: dto.isActive }),
      },
      create: {
        key,
        name: dto.name,
        version: dto.version,
        config: dto.config as never,
        isActive: dto.isActive ?? false,
      },
    });
  }

  async setActive(key: string, isActive: boolean) {
    return this.prisma.plugin.upsert({
      where: { key },
      update: { isActive },
      create: { key, name: key, isActive },
    });
  }

  async register(plugin: CrmPlugin) {
    if (!plugin.key || plugin.key.trim() === '')
      throw new BadRequestException('Plugin key is required');
    if (!plugin.name || plugin.name.trim() === '')
      throw new BadRequestException('Plugin name is required');

    if (this.registry.has(plugin.key))
      throw new BadRequestException('Plugin already registered');

    const endpoints = this.normalizeEndpoints(plugin.endpoints ?? []);
    plugin.endpoints = endpoints;

    this.registry.set(plugin.key, plugin);

    await this.ensurePermissions(plugin.permissions ?? []);

    const row = await this.prisma.plugin.upsert({
      where: { key: plugin.key },
      update: {
        name: plugin.name,
        ...(plugin.version == null ? {} : { version: plugin.version }),
      },
      create: {
        key: plugin.key,
        name: plugin.name,
        version: plugin.version,
        isActive: false,
      },
    });

    if (row.isActive) await this.activateRuntime(plugin.key);
  }

  async dispatchEndpoint(args: {
    key: string;
    method: PluginHttpMethod;
    path: string;
    body: unknown;
    query: Record<string, unknown>;
    actorUserId: string;
    roleId: string;
  }) {
    const plugin = this.registry.get(args.key);
    if (!plugin) throw new NotFoundException('Plugin not registered');

    const normalizedPath = this.normalizeEndpointPath(args.path);
    if (!normalizedPath) throw new NotFoundException('Endpoint not found');
    if (this.reservedEndpointPaths.has(normalizedPath))
      throw new NotFoundException('Endpoint not found');

    const row = await this.prisma.plugin.findUnique({
      where: { key: args.key },
      select: { isActive: true },
    });
    if (!row?.isActive) throw new NotFoundException('Plugin is not active');

    await this.activateRuntime(args.key);

    const endpoint = (plugin.endpoints ?? []).find(
      (e) => e.method === args.method && e.path === normalizedPath,
    );
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    const requiredPermissions = endpoint.requiredPermissions ?? [];
    if (requiredPermissions.length > 0) {
      const ok = await this.hasPermissions(args.roleId, requiredPermissions);
      if (!ok) throw new ForbiddenException();
    }

    const ctx: PluginContext = {
      prisma: this.prisma,
      eventBus: this.eventBus,
      auditService: this.auditService,
      notificationsService: this.notificationsService,
    };

    return endpoint.handler(ctx, {
      method: args.method,
      path: normalizedPath,
      body: args.body,
      query: args.query,
      actorUserId: args.actorUserId,
      roleId: args.roleId,
    });
  }

  async activate(key: string) {
    if (!this.registry.has(key))
      throw new NotFoundException('Plugin not registered');

    const row = await this.setActive(key, true);
    await this.activateRuntime(key);
    return row;
  }

  async deactivate(key: string) {
    if (!this.registry.has(key))
      throw new NotFoundException('Plugin not registered');

    const row = await this.setActive(key, false);
    await this.deactivateRuntime(key);
    return row;
  }

  private async ensurePermissions(permissions: PluginPermission[]) {
    if (permissions.length === 0) return;

    const rows = permissions.map((p) => {
      const parts = p.key.split('.');
      if (parts.length !== 2)
        throw new BadRequestException(`Invalid permission key: ${p.key}`);
      const [module, action] = parts;
      return {
        key: p.key,
        module,
        action,
        description: p.description,
      };
    });

    await this.prisma.permission.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  private async hasPermissions(roleId: string, required: string[]) {
    const roleWithPermissions = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        rolePermissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });

    const permissionKeys = new Set(
      roleWithPermissions?.rolePermissions.map((rp) => rp.permission.key) ?? [],
    );

    return required.every((key) => permissionKeys.has(key));
  }

  private normalizeEndpointPath(value: string) {
    return value.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private normalizeEndpoints(endpoints: PluginEndpoint[]) {
    const normalized: PluginEndpoint[] = [];
    const seen = new Set<string>();

    for (const endpoint of endpoints) {
      const path = this.normalizeEndpointPath(endpoint.path);
      if (!path)
        throw new BadRequestException('Plugin endpoint path is required');
      if (this.reservedEndpointPaths.has(path))
        throw new BadRequestException(`Reserved endpoint path: ${path}`);

      const key = `${endpoint.method}:${path}`;
      if (seen.has(key))
        throw new BadRequestException(`Duplicate plugin endpoint: ${key}`);
      seen.add(key);

      normalized.push({ ...endpoint, path });
    }

    return normalized;
  }

  private async withLock(key: string, fn: () => Promise<void>) {
    const previous = this.locks.get(key) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(fn)
      .finally(() => {
        if (this.locks.get(key) === next) this.locks.delete(key);
      });

    this.locks.set(key, next);
    await next;
  }

  private async activateRuntime(key: string) {
    await this.withLock(key, async () => {
      if (this.active.has(key)) return;
      const plugin = this.registry.get(key);
      if (!plugin) return;

      const ctx: PluginContext = {
        prisma: this.prisma,
        eventBus: this.eventBus,
        auditService: this.auditService,
        notificationsService: this.notificationsService,
      };

      await plugin.onActivate?.(ctx);
      this.active.add(key);
      this.logger.log({ type: 'plugin', action: 'activated', key }, 'Plugins');
    });
  }

  private async deactivateRuntime(key: string) {
    await this.withLock(key, async () => {
      if (!this.active.has(key)) return;
      const plugin = this.registry.get(key);
      if (!plugin) return;

      const ctx: PluginContext = {
        prisma: this.prisma,
        eventBus: this.eventBus,
        auditService: this.auditService,
        notificationsService: this.notificationsService,
      };

      await plugin.onDeactivate?.(ctx);
      this.active.delete(key);
      this.logger.log(
        { type: 'plugin', action: 'deactivated', key },
        'Plugins',
      );
    });
  }
}
