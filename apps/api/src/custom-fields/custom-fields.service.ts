import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldEntityType, CustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { ListCustomFieldsQuery } from './dto/list-custom-fields.query';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';

type DbClient = PrismaService | Prisma.TransactionClient;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeKey = (value: string) => value.trim();
const normalizeLabel = (value: string) => value.trim();

const normalizeOptions = (options: string[] | undefined) => {
  if (!options) return undefined;
  const normalized = options.map((o) => o.trim()).filter(Boolean);
  return Array.from(new Set(normalized));
};

const validateValue = (
  def: {
    key: string;
    type: CustomFieldType;
    required: boolean;
    options: unknown;
  },
  value: unknown,
) => {
  if (value == null) {
    if (def.required) throw new BadRequestException(`${def.key} is required`);
    return;
  }

  if (def.type === CustomFieldType.TEXT) {
    if (typeof value !== 'string')
      throw new BadRequestException(`${def.key} must be string`);
    return;
  }
  if (def.type === CustomFieldType.NUMBER) {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new BadRequestException(`${def.key} must be number`);
    return;
  }
  if (def.type === CustomFieldType.BOOLEAN) {
    if (typeof value !== 'boolean')
      throw new BadRequestException(`${def.key} must be boolean`);
    return;
  }
  if (def.type === CustomFieldType.DATE) {
    if (typeof value !== 'string')
      throw new BadRequestException(`${def.key} must be ISO date string`);
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException(`${def.key} must be valid date`);
    return;
  }
  if (def.type === CustomFieldType.SELECT) {
    if (typeof value !== 'string')
      throw new BadRequestException(`${def.key} must be string`);
    const options = Array.isArray(def.options)
      ? def.options.filter((o): o is string => typeof o === 'string')
      : [];
    if (options.length > 0 && !options.includes(value))
      throw new BadRequestException(
        `${def.key} must be one of ${options.join(', ')}`,
      );
    return;
  }
};

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDefinitions(query: ListCustomFieldsQuery) {
    const q = query.q?.trim();

    const where = {
      ...(query.entityType
        ? { entityType: query.entityType as CustomFieldEntityType }
        : {}),
      ...(q
        ? {
            OR: [
              { key: { contains: q, mode: 'insensitive' as const } },
              { label: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.customFieldDefinition.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { key: 'asc' }],
    });

    return { items };
  }

  async createDefinition(dto: CreateCustomFieldDto) {
    const entityType = dto.entityType as CustomFieldEntityType;
    const key = normalizeKey(dto.key);
    const label = normalizeLabel(dto.label);
    const type = dto.type as CustomFieldType;
    const required = dto.required ?? false;
    const options = normalizeOptions(dto.options);

    if (type === CustomFieldType.SELECT) {
      if (!options || options.length === 0)
        throw new BadRequestException('options is required for SELECT');
    }

    try {
      return await this.prisma.customFieldDefinition.create({
        data: {
          entityType,
          key,
          label,
          type,
          required,
          options: options ?? undefined,
        },
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === 'P2002')
        throw new BadRequestException('Custom field key already exists');
      throw e;
    }
  }

  async updateDefinition(id: string, dto: UpdateCustomFieldDto) {
    const existing = await this.prisma.customFieldDefinition.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Custom field not found');

    const nextType =
      dto.type == null ? existing.type : (dto.type as CustomFieldType);
    const options = normalizeOptions(dto.options);

    if (nextType === CustomFieldType.SELECT) {
      const nextOptions = options ?? (existing.options as unknown);
      const list = Array.isArray(nextOptions)
        ? nextOptions.filter((o): o is string => typeof o === 'string')
        : [];
      if (list.length === 0)
        throw new BadRequestException('options is required for SELECT');
    }

    try {
      return await this.prisma.customFieldDefinition.update({
        where: { id },
        data: {
          ...(dto.key == null ? {} : { key: normalizeKey(dto.key) }),
          ...(dto.label == null ? {} : { label: normalizeLabel(dto.label) }),
          ...(dto.type == null ? {} : { type: dto.type as CustomFieldType }),
          ...(dto.required == null ? {} : { required: dto.required }),
          ...(dto.options == null ? {} : { options: options ?? [] }),
        },
      });
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === 'P2002')
        throw new BadRequestException('Custom field key already exists');
      throw e;
    }
  }

  async deleteDefinition(id: string) {
    const existing = await this.prisma.customFieldDefinition.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Custom field not found');

    await this.prisma.customFieldDefinition.delete({ where: { id } });
    return { id };
  }

  async getValuesMap(
    db: DbClient,
    entityType: CustomFieldEntityType,
    entityId: string,
  ) {
    const values = await db.customFieldValue.findMany({
      where: { entityType, entityId },
      include: {
        definition: { select: { key: true } },
      },
    });

    const map: Record<string, unknown> = {};
    for (const row of values) {
      map[row.definition.key] = row.value as unknown;
    }
    return map;
  }

  async writeValues(args: {
    db: DbClient;
    entityType: CustomFieldEntityType;
    entityId: string;
    customFields: unknown;
    requireAllRequired: boolean;
  }) {
    if (args.customFields == null) {
      if (!args.requireAllRequired) return;
      const required = await args.db.customFieldDefinition.findMany({
        where: { entityType: args.entityType, required: true },
        select: { key: true },
      });
      if (required.length > 0)
        throw new BadRequestException(
          `customFields is required (${required.map((r) => r.key).join(', ')})`,
        );
      return;
    }

    if (!isRecord(args.customFields))
      throw new BadRequestException('customFields must be object');

    const entries = Object.entries(args.customFields).map(
      ([k, v]) => [normalizeKey(k), v] as const,
    );
    const keys = Array.from(new Set(entries.map(([k]) => k))).filter(
      (k): k is string => k.trim() !== '',
    );
    if (keys.length === 0) {
      if (args.requireAllRequired) {
        const required = await args.db.customFieldDefinition.findMany({
          where: { entityType: args.entityType, required: true },
          select: { key: true },
        });
        if (required.length > 0)
          throw new BadRequestException(
            `customFields is required (${required.map((r) => r.key).join(', ')})`,
          );
      }
      return;
    }

    const definitions = await args.db.customFieldDefinition.findMany({
      where: { entityType: args.entityType, key: { in: keys } },
      select: {
        id: true,
        key: true,
        type: true,
        required: true,
        options: true,
      },
    });

    const defByKey = new Map(definitions.map((d) => [d.key, d]));
    for (const key of keys) {
      if (!defByKey.has(key))
        throw new BadRequestException(`Unknown custom field: ${key}`);
    }

    if (args.requireAllRequired) {
      const required = await args.db.customFieldDefinition.findMany({
        where: { entityType: args.entityType, required: true },
        select: { key: true },
      });
      const inputKeySet = new Set(keys);
      const missing = required.filter((r) => !inputKeySet.has(r.key));
      if (missing.length > 0)
        throw new BadRequestException(
          `Missing required custom fields: ${missing
            .map((m) => m.key)
            .join(', ')}`,
        );
    }

    for (const [key, value] of entries) {
      const def = defByKey.get(key);
      if (!def) continue;
      validateValue(def, value);
    }

    for (const [key, value] of entries) {
      const def = defByKey.get(key);
      if (!def) continue;

      if (value == null) {
        await args.db.customFieldValue.deleteMany({
          where: { definitionId: def.id, entityId: args.entityId },
        });
        continue;
      }

      await args.db.customFieldValue.upsert({
        where: {
          definitionId_entityId: {
            definitionId: def.id,
            entityId: args.entityId,
          },
        },
        update: { value: value as never, entityType: args.entityType },
        create: {
          definitionId: def.id,
          entityType: args.entityType,
          entityId: args.entityId,
          value: value as never,
        },
      });
    }
  }
}
