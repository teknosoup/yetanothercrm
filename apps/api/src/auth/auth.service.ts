import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        roleId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) throw new UnauthorizedException();

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();

    const payload = { sub: user.id, email: user.email, roleId: user.roleId };

    const expiresInEnv = this.configService.get<string>('JWT_EXPIRES_IN');
    const expiresIn = (expiresInEnv ?? '1d') as StringValue;
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    const refreshToken = await this.issueRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) return { ok: true };

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresMinutes = Number(
      this.configService.get<string>('PASSWORD_RESET_EXPIRES_MINUTES') ?? 30,
    );
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const debug =
      this.configService.get<string>('PASSWORD_RESET_DEBUG') === 'true';
    if (debug) return { ok: true, token, expiresAt: expiresAt.toISOString() };

    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, userId: true },
    });

    if (!resetToken) throw new BadRequestException('Invalid or expired token');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { ok: true };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashOpaqueToken(refreshToken);
    const now = new Date();

    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });

    if (!existing) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      select: { id: true, email: true, roleId: true, isActive: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException();

    const payload = { sub: user.id, email: user.email, roleId: user.roleId };
    const expiresInEnv = this.configService.get<string>('JWT_EXPIRES_IN');
    const expiresIn = (expiresInEnv ?? '1d') as StringValue;
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    const newRefreshToken = await this.issueRefreshToken(user.id);

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: now },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { ok: true };

    const tokenHash = this.hashOpaqueToken(refreshToken);
    const now = new Date();

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });

    return { ok: true };
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashOpaqueToken(token);
    const refreshDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') ?? 30,
    );
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return token;
  }

  private hashOpaqueToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
