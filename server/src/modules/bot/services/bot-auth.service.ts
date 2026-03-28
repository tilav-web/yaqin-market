import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { Auth } from '../../auth/auth.entity';
import { User } from '../../user/user.entity';
import { Telegram } from '../../telegram/uset-telegram.entity';
import { JwtTypeEnum } from '../../../enums/jwt-type.enum';
import { BotService } from '../bot.service';
import { BotKeyboards } from '../keyboards/bot.keyboards';
import { RateLimitRedisService } from '../../redis/rate-limit.redis.service';
import { createHmac } from 'node:crypto';

type TelegramInitDataUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

@Injectable()
export class BotAuthService {
  private readonly logger = new Logger(BotAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly keyboards: BotKeyboards,
    private readonly rateLimitRedisService: RateLimitRedisService,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Telegram)
    private readonly telegramRepository: Repository<Telegram>,
  ) {}

  getWebAppUrl() {
    return (
      this.configService.get<string>('TELEGRAM_WEBAPP_URL') ??
      'https://yaqin-market.uz/login?tg=1'
    );
  }

  validateInitData(initData: string): {
    user: TelegramInitDataUser;
    auth_date: number;
  } {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Telegram bot token is not configured');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('Telegram hash is missing');
    }

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram signature');
    }

    const authDate = Number(params.get('auth_date') || 0);
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 86400) {
      throw new UnauthorizedException('Telegram session is expired');
    }

    const rawUser = params.get('user');
    if (!rawUser) {
      throw new UnauthorizedException('Telegram user is missing');
    }

    try {
      const user = JSON.parse(rawUser) as TelegramInitDataUser;
      return { user, auth_date: authDate };
    } catch {
      throw new UnauthorizedException('Telegram user payload is invalid');
    }
  }

  async getTelegramAccountStatus(telegramId: number) {
    const auth = await this.authRepository.findOne({
      where: { telegram_id: telegramId },
    });

    return {
      hasVerifiedPhone: Boolean(auth?.phone && auth.is_verified),
    };
  }

  async createWebAppSession({
    initData,
    res,
  }: {
    initData: string;
    res: Response;
  }) {
    const parsed = this.validateInitData(initData);
    const auth = await this.authRepository.findOne({
      where: { telegram_id: parsed.user.id },
      relations: { user: true },
    });

    if (!auth?.phone || !auth.is_verified || !auth.user) {
      return {
        success: true,
        linked: false,
        requires_phone_verification: true,
        telegram_user: parsed.user,
      };
    }

    await this.ensureTelegramProfile({
      telegramId: parsed.user.id,
      username: parsed.user.username ?? null,
      firstName: parsed.user.first_name ?? null,
      lastName: parsed.user.last_name ?? null,
      user: auth.user,
    });

    const accessToken = this.signAccessToken(auth);
    const refreshToken = this.signRefreshToken(auth);
    this.setRefreshCookie(res, refreshToken);

    return {
      success: true,
      linked: true,
      requires_phone_verification: false,
      access_token: accessToken,
      user: auth.user,
    };
  }

  async requestPhoneVerification(initData: string) {
    const parsed = this.validateInitData(initData);
    const rateLimit = await this.rateLimitRedisService.consume(
      `bot:request-phone:${parsed.user.id}`,
      5,
      300,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        "Telefon tasdiqlash so'rovi limiti tugadi. Keyinroq urinib ko'ring",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.botService
      .getBot()
      .api.sendMessage(
        parsed.user.id,
        "Telefon raqamingizni yuboring. Bu Telegram tomonidan tasdiqlangan telefon bo'ladi.",
        {
          reply_markup: this.keyboards.buildContactRequestKeyboard(),
        },
      );

    await this.botService
      .getBot()
      .api.sendMessage(
        parsed.user.id,
        'Telefonni yuborganingizdan keyin mini-appga qaytib davom etishingiz mumkin.',
        {
          reply_markup: this.keyboards.buildOpenWebAppInlineKeyboard(
            this.getWebAppUrl(),
          ),
        },
      );

    return {
      success: true,
      message: "Telefon tasdiqlash so'rovi Telegram botga yuborildi",
    };
  }

  async sendOtpToTelegram({
    telegramId,
    otp,
  }: {
    telegramId: number;
    otp: string;
  }) {
    try {
      await this.botService
        .getBot()
        .api.sendMessage(
          telegramId,
          `Yaqin Market login kodi: ${otp}\nKod 2 daqiqa amal qiladi.`,
          {
            reply_markup: this.keyboards.buildOpenWebAppInlineKeyboard(
              this.getWebAppUrl(),
            ),
          },
        );

      return true;
    } catch (error) {
      this.logger.warn(`Failed to send OTP to Telegram: ${String(error)}`);
      return false;
    }
  }

  async linkVerifiedTelegramContact({
    telegramId,
    username,
    firstName,
    lastName,
    phone,
  }: {
    telegramId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  }) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException("Telefon raqami noto'g'ri");
    }

    const result = await this.authRepository.manager.transaction(
      async (manager) => {
        const authByTelegram = await manager.findOne(Auth, {
          where: { telegram_id: telegramId },
          relations: { user: true },
        });
        const authByPhone = await manager.findOne(Auth, {
          where: { phone: normalizedPhone },
          relations: { user: true },
        });

        if (authByTelegram?.phone && authByTelegram.phone !== normalizedPhone) {
          throw new BadRequestException(
            "Bu Telegram akkaunt boshqa telefon raqamga bog'langan.",
          );
        }

        if (
          authByPhone?.telegram_id &&
          authByPhone.telegram_id !== telegramId
        ) {
          throw new BadRequestException(
            "Bu telefon boshqa Telegram akkauntga bog'langan.",
          );
        }

        let auth = authByPhone ?? authByTelegram;
        let isNewAccount = false;

        if (!auth) {
          auth = manager.create(Auth, {
            phone: normalizedPhone,
            telegram_id: telegramId,
            is_verified: true,
          });
          auth = await manager.save(Auth, auth);
          isNewAccount = true;
        } else {
          auth.phone = normalizedPhone;
          auth.telegram_id = telegramId;
          auth.is_verified = true;
          auth = await manager.save(Auth, auth);
        }

        let user = auth.user;
        if (!user) {
          user = manager.create(User, {
            auth,
            first_name: firstName || '-',
            last_name: lastName || '-',
          });
          user = await manager.save(User, user);
        } else {
          if (firstName && (!user.first_name || user.first_name === '-')) {
            user.first_name = firstName;
          }
          if (lastName && (!user.last_name || user.last_name === '-')) {
            user.last_name = lastName;
          }
          user = await manager.save(User, user);
        }

        let telegram = await manager.findOne(Telegram, {
          where: { telegram_id: telegramId },
          relations: { user: true },
        });

        if (!telegram) {
          telegram = manager.create(Telegram, {
            telegram_id: telegramId,
            username,
            first_name: firstName || '-',
            last_name: lastName || '-',
            user,
            is_active: true,
            restarted_at: new Date(),
          });
        } else {
          telegram.username = username;
          telegram.first_name = firstName || telegram.first_name;
          telegram.last_name = lastName || telegram.last_name;
          telegram.user = user;
          telegram.is_active = true;
          telegram.restarted_at = new Date();
        }

        telegram = await manager.save(Telegram, telegram);

        return { auth, user, telegram, isNewAccount };
      },
    );

    return {
      success: true,
      message: result.isNewAccount
        ? 'Telefon raqamingiz tasdiqlandi va profilingiz yaratildi.'
        : "Telefon raqamingiz muvaffaqiyatli bog'landi.",
      auth: result.auth,
      user: result.user,
    };
  }

  private async ensureTelegramProfile({
    telegramId,
    username,
    firstName,
    lastName,
    user,
  }: {
    telegramId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    user: User;
  }) {
    let telegram = await this.telegramRepository.findOne({
      where: { telegram_id: telegramId },
      relations: { user: true },
    });

    if (!telegram) {
      telegram = this.telegramRepository.create({
        telegram_id: telegramId,
        username,
        first_name: firstName || '-',
        last_name: lastName || '-',
        user,
        is_active: true,
        restarted_at: new Date(),
      });
    } else {
      telegram.username = username;
      telegram.first_name = firstName || telegram.first_name;
      telegram.last_name = lastName || telegram.last_name;
      telegram.user = user;
      telegram.is_active = true;
      telegram.restarted_at = new Date();
    }

    await this.telegramRepository.save(telegram);
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
    const isProd =
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.COOKIE_SECURE !== 'false' &&
        process.env.NODE_ENV === 'production');
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
