import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthDec } from './decorators/user.decorator';
import { Auth } from './auth.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findMe(@AuthDec() auth: Auth) {
    return this.authService.findMe(auth.id);
  }

  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto, @Ip() ip: string) {
    return this.authService.sendOtp({
      phone: dto.phone,
      ip,
    });
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp({
      phone: dto.phone,
      otp: dto.otp,
      ip,
      res,
    });
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body('refresh_token') bodyToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = bodyToken || this.getCookie(req, 'refresh_token');
    return this.authService.refreshAccessToken({ refreshToken, res });
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  private getCookie(req: Request, name: string) {
    const raw = req.headers.cookie;
    if (!raw) return undefined;
    const parts = raw.split(';').map((c) => c.trim());
    const target = parts.find((c) => c.startsWith(`${name}=`));
    if (!target) return undefined;
    return decodeURIComponent(target.slice(name.length + 1));
  }
}
