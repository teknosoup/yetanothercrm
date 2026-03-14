import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListPluginsQuery } from './dto/list-plugins.query';
import { UpsertPluginDto } from './dto/upsert-plugin.dto';

@Injectable()
export class PluginsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
