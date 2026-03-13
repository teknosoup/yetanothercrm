import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
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

    return { accessToken };
  }
}
