import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { RequestUser } from './request-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException();

    const roleWithPermissions = await this.prisma.role.findUnique({
      where: { id: user.roleId },
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
}
