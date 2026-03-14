import {
  Body,
  Controller,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { minutes, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookie(req: Request, name: string) {
    const raw = req.headers.cookie;
    if (!raw) return undefined;
    const parts = raw.split(';');
    for (const part of parts) {
      const [k, ...rest] = part.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
    return undefined;
  }

  private cookieOptions() {
    const secure = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);
    const base = this.cookieOptions();
    res.cookie('access_token', result.accessToken, base);
    res.cookie('refresh_token', result.refreshToken, base);
    return result;
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  @Post('password/forgot')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  @Post('password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: minutes(1) } })
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      dto.refreshToken ?? this.getCookie(res.req, 'refresh_token');
    if (!refreshToken) throw new UnauthorizedException();
    const result = await this.authService.refresh(refreshToken);
    const base = this.cookieOptions();
    res.cookie('access_token', result.accessToken, base);
    res.cookie('refresh_token', result.refreshToken, base);
    return result;
  }

  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: minutes(1) } })
  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      dto.refreshToken ?? this.getCookie(res.req, 'refresh_token');
    const result = await this.authService.logout(refreshToken);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return result;
  }
}
