import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListPermissionsQuery } from './dto/list-permissions.query';
import { ListRolesQuery } from './dto/list-roles.query';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listRoles(query: ListRolesQuery) {
    const q = query.q?.trim();
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;

    const where = q
      ? { name: { contains: q, mode: 'insensitive' as const } }
      : {};

    const [total, data] = await this.prisma.$transaction([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      }),
    ]);

    const roles = data.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissionKeys: r.rolePermissions.map((rp) => rp.permission.key).sort(),
    }));

    return { total, data: roles, skip, take };
  }

  async findRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionKeys: role.rolePermissions
        .map((rp) => rp.permission.key)
        .sort(),
    };
  }

  async createRole(dto: CreateRoleDto, actorUserId: string) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Role name already exists');

    const permissionKeys = Array.isArray(dto.permissionKeys)
      ? Array.from(
          new Set(dto.permissionKeys.map((k) => k.trim()).filter(Boolean)),
        )
      : [];

    const permissions = permissionKeys.length
      ? await this.prisma.permission.findMany({
          where: { key: { in: permissionKeys } },
          select: { id: true, key: true },
        })
      : [];
    const permissionByKey = new Map(permissions.map((p) => [p.key, p]));
    for (const key of permissionKeys) {
      if (!permissionByKey.has(key))
        throw new BadRequestException(`Unknown permission key: ${key}`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: { name: dto.name, description: dto.description },
      });

      if (permissionKeys.length) {
        await tx.rolePermission.createMany({
          data: permissionKeys.map((key) => ({
            roleId: role.id,
            permissionId: permissionByKey.get(key)!.id,
          })),
          skipDuplicates: true,
        });
      }

      const withPermissions = await tx.role.findUnique({
        where: { id: role.id },
        include: { rolePermissions: { include: { permission: true } } },
      });

      return withPermissions!;
    });

    const result = {
      id: created.id,
      name: created.name,
      description: created.description,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      permissionKeys: created.rolePermissions
        .map((rp) => rp.permission.key)
        .sort(),
    };

    await this.auditService.log({
      actorUserId,
      action: 'role.create',
      entityType: 'role',
      entityId: result.id,
      after: result,
    });

    return result;
  }

  async updateRole(id: string, dto: UpdateRoleDto, actorUserId: string) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!existing) throw new NotFoundException('Role not found');

    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.prisma.role.findUnique({
        where: { name: dto.name },
        select: { id: true },
      });
      if (conflict) throw new BadRequestException('Role name already exists');
    }

    const permissionKeys =
      dto.permissionKeys == null
        ? null
        : Array.from(
            new Set(dto.permissionKeys.map((k) => k.trim()).filter(Boolean)),
          );

    const permissions = permissionKeys?.length
      ? await this.prisma.permission.findMany({
          where: { key: { in: permissionKeys } },
          select: { id: true, key: true },
        })
      : [];
    const permissionByKey = new Map(permissions.map((p) => [p.key, p]));
    for (const key of permissionKeys ?? []) {
      if (!permissionByKey.has(key))
        throw new BadRequestException(`Unknown permission key: ${key}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.update({
        where: { id },
        data: {
          ...(dto.name == null ? {} : { name: dto.name }),
          ...(dto.description == null ? {} : { description: dto.description }),
        },
      });

      if (permissionKeys != null) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionKeys.length) {
          await tx.rolePermission.createMany({
            data: permissionKeys.map((key) => ({
              roleId: id,
              permissionId: permissionByKey.get(key)!.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      const withPermissions = await tx.role.findUnique({
        where: { id: role.id },
        include: { rolePermissions: { include: { permission: true } } },
      });

      return withPermissions!;
    });

    const result = {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      permissionKeys: updated.rolePermissions
        .map((rp) => rp.permission.key)
        .sort(),
    };

    await this.auditService.log({
      actorUserId,
      action: 'role.update',
      entityType: 'role',
      entityId: result.id,
      before: {
        id: existing.id,
        name: existing.name,
        description: existing.description,
        permissionKeys: existing.rolePermissions
          .map((rp) => rp.permission.key)
          .sort(),
      },
      after: result,
    });

    return result;
  }

  async deleteRole(id: string, actorUserId: string) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true, description: true },
    });
    if (!existing) throw new NotFoundException('Role not found');

    const usersCount = await this.prisma.user.count({ where: { roleId: id } });
    if (usersCount > 0)
      throw new BadRequestException('Role is still used by users');

    await this.prisma.role.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'role.delete',
      entityType: 'role',
      entityId: existing.id,
      before: existing,
    });

    return { id: existing.id };
  }

  async listPermissions(query: ListPermissionsQuery) {
    const q = query.q?.trim();
    const take = query.take ?? 200;
    const skip = query.skip ?? 0;

    const where = {
      ...(query.module ? { module: query.module } : {}),
      ...(q
        ? {
            OR: [
              { key: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.permission.count({ where }),
      this.prisma.permission.findMany({
        where,
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
        skip,
        take,
      }),
    ]);

    return { total, data, skip, take };
  }
}
