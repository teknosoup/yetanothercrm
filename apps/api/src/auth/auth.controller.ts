import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('password/forgot')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
