import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Auth } from './auth.entity';
import { Repository } from 'typeorm';
import { AuthRedisService } from '../redis/auth.redis.service';
import { generateOtp } from '../../common/utils/otp.util';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtTypeEnum } from 'src/enums/jwt-type.enum';
import type { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth) private readonly repository: Repository<Auth>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly authRedisService: AuthRedisService,
    private readonly jwtService: JwtService,
  ) {}

  async findById(id: string) {
    const auth = await this.repository.findOne({
      where: {
        id,
      },
    });

    if (!auth) throw new NotFoundException('User not found!');

    return auth;
  }

  async findAuthWithUser(id: string) {
    const auth = await this.repository.findOne({
      where: { id },
      relations: {
        user: {
          stores: true,
        },
      },
    });

    if (!auth) {
      throw new NotFoundException('User not found!');
    }

    return auth;
  }

  async findMe(id: string) {
    return this.repository.findOne({
      where: {
        id,
      },
      relations: {
        user: {
          stores: true,
        },
      },
    });
  }

  async findByPhone(phone: string) {
    return this.repository.findOne({
      where: {
        phone: this.normalizePhone(phone),
      },
    });
  }

  async sendOtp({ phone, ip }: { phone: string; ip: string }) {
    const normalizedPhone = this.normalizePhone(phone);
    const existingOtp = await this.authRedisService.getOtp(normalizedPhone, ip);
    let previewOtp: string | undefined;

    if (!existingOtp) {
      const otp = generateOtp(6);
      await this.authRedisService.saveOtp(normalizedPhone, ip, otp);
      previewOtp = otp;
    } else if (process.env.NODE_ENV !== 'production') {
      previewOtp = existingOtp;
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      otp_length: 6 as const,
      otp_preview: process.env.NODE_ENV !== 'production' ? previewOtp : undefined,
    };
  }

  async verifyOtp({
    phone,
    otp,
    ip,
    res,
  }: {
    phone: string;
    otp: string;
    ip: string;
    res: Response;
  }) {
    const normalizedPhone = this.normalizePhone(phone);
    const savedOtp = await this.authRedisService.getOtp(normalizedPhone, ip);

    if (!savedOtp || savedOtp !== otp) {
      throw new BadRequestException('Invalid otp');
    }

    await this.authRedisService.deleteOtp(normalizedPhone, ip);

    let auth = await this.repository.findOne({
      where: { phone: normalizedPhone },
      relations: {
        user: true,
      },
    });

    if (!auth) {
      auth = this.repository.create({ phone: normalizedPhone });
      auth = await this.repository.save(auth);
    }

    if (!auth.user) {
      const user = this.userRepository.create({ auth });
      await this.userRepository.save(user);
      auth.user = user;
    }

    const accessToken = this.signAccessToken(auth);
    const refreshToken = this.signRefreshToken(auth);
    this.setRefreshCookie(res, refreshToken);

    return {
      success: true,
      access_token: accessToken,
      userId: auth.user?.id ?? null,
    };
  }

  async refreshAccessToken({
    refreshToken,
    res,
  }: {
    refreshToken?: string;
    res: Response;
  }) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    let payload: { id: string; type: JwtTypeEnum };
    try {
      payload = this.jwtService.verify<{ id: string; type: JwtTypeEnum }>(
        refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== JwtTypeEnum.REFRESH || !payload.id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const auth = await this.findById(payload.id);

    const newAccessToken = this.signAccessToken(auth);
    const newRefreshToken = this.signRefreshToken(auth);
    this.setRefreshCookie(res, newRefreshToken);

    return {
      success: true,
      access_token: newAccessToken,
    };
  }

  private signAccessToken(auth: Auth) {
    return this.jwtService.sign(
      {
        id: auth.id,
        role: auth.role,
        type: JwtTypeEnum.ACCESS,
      },
      { expiresIn: '15m' },
    );
  }

  private signRefreshToken(auth: Auth) {
    return this.jwtService.sign(
      {
        id: auth.id,
        role: auth.role,
        type: JwtTypeEnum.REFRESH,
      },
      { expiresIn: '30d' },
    );
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '').slice(-9);
  }
}
