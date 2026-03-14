import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { ListPluginsQuery } from './dto/list-plugins.query';
import { UpsertPluginDto } from './dto/upsert-plugin.dto';

export type PluginPermission = {
  key: string;
  description?: string;
};

export type PluginContext = {
  prisma: PrismaService;
  eventBus: EventBusService;
};

export type CrmPlugin = {
  key: string;
  name: string;
  version?: string;
  permissions?: PluginPermission[];
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
  ) {}

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
