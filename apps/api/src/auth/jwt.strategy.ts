import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { RequestUser } from '../common/auth/request-user';

export type JwtPayload = {
  sub: string;
  email: string;
  roleId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET is required');
    }
    const issuer = configService.get<string>('JWT_ISSUER');
    const audience = configService.get<string>('JWT_AUDIENCE');
    const cookieExtractor = (req: Request | undefined) => {
      const raw = req?.headers?.cookie;
      if (!raw) return null;
      const parts = raw.split(';');
      for (const part of parts) {
        const [k, ...rest] = part.trim().split('=');
        if (k === 'access_token') return decodeURIComponent(rest.join('='));
      }
      return null;
    };
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey,
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
    };
  }
}
