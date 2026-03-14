import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  async list(query: ListUsersQuery) {
    const q = query.q?.trim();
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;

    const where = {
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.isActive == null ? {} : { isActive: query.isActive }),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { fullName: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { total, data, skip, take };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actorUserId: string) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingEmail) throw new BadRequestException('Email already in use');

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
      select: { id: true },
    });
    if (!role) throw new BadRequestException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        roleId: dto.roleId,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'user.create',
      entityType: 'user',
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async update(id: string, dto: UpdateUserAdminDto, actorUserId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        roleId: true,
      },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
        select: { id: true },
      });
      if (!role) throw new BadRequestException('Role not found');
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          isActive: dto.isActive,
          roleId: dto.roleId,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { id: true, name: true } },
        },
      });

      if (dto.isActive === false) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      return result;
    });

    await this.auditService.log({
      actorUserId,
      action: 'user.update',
      entityType: 'user',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async resetPassword(
    id: string,
    dto: ResetUserPasswordDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        roleId: true,
      },
    });
    if (!existing) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash },
        select: { id: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    await this.auditService.log({
      actorUserId,
      action: 'user.reset_password',
      entityType: 'user',
      entityId: id,
      before: existing,
      after: { id, passwordChangedAt: now.toISOString() },
    });

    return { ok: true };
  }
}
