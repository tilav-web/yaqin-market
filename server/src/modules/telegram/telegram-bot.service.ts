import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context } from 'grammy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Telegram } from './uset-telegram.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtTypeEnum } from '../../enums/jwt-type.enum';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly bot: Bot;
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Telegram)
    private readonly telegramRepo: Repository<Telegram>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token || 'MISSING_TOKEN');
  }

  async onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, bot will not start');
      return;
    }

    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.command('orders', (ctx) => this.handleMyOrders(ctx));
    this.bot.command('help', (ctx) => this.handleHelp(ctx));

    this.bot.on('message:web_app_data', (ctx) =>
      this.handleWebAppData(ctx),
    );

    this.bot.catch((err) => {
      this.logger.error('Bot error:', err);
    });

    this.bot.start({
      onStart: () => this.logger.log('Telegram bot started'),
    });
  }

  getBot(): Bot {
    return this.bot;
  }

  validateInitData(initData: string): {
    user?: { id: number; first_name: string; last_name?: string; username?: string };
    auth_date: number;
  } | null {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) return null;

    const crypto = require('crypto');
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) return null;

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;

    try {
      const user = JSON.parse(userRaw);
      return { user, auth_date: authDate };
    } catch {
      return null;
    }
  }

  async authenticateViaTelegram(initData: string) {
    const parsed = this.validateInitData(initData);
    if (!parsed?.user) {
      return { success: false, message: 'Invalid Telegram initData' };
    }

    const tgUser = parsed.user;

    let telegram = await this.telegramRepo.findOne({
      where: { telegram_id: tgUser.id },
      relations: ['user', 'user.auth'],
    });

    if (telegram) {
      telegram.username = tgUser.username || null;
      telegram.is_active = true;
      await this.telegramRepo.save(telegram);

      const auth = telegram.user?.auth;
      if (auth) {
        const accessToken = this.signAccessToken(auth);
        return {
          success: true,
          access_token: accessToken,
          user: telegram.user,
          is_new: false,
        };
      }
    }

    let auth = await this.authRepo.findOne({
      where: { telegram_id: tgUser.id },
      relations: ['user'],
    });

    if (!auth) {
      auth = this.authRepo.create({
        telegram_id: tgUser.id,
        phone: '',
        is_verified: false,
      });
      auth = await this.authRepo.save(auth);
    }

    if (!auth.user) {
      const user = this.userRepo.create({
        first_name: tgUser.first_name,
        last_name: tgUser.last_name || '-',
        auth,
      });
      await this.userRepo.save(user);
      auth.user = user;
    }

    if (!telegram) {
      telegram = this.telegramRepo.create({
        telegram_id: tgUser.id,
        username: tgUser.username || null,
        user: auth.user,
      });
      await this.telegramRepo.save(telegram);
    }

    const accessToken = this.signAccessToken(auth);
    return {
      success: true,
      access_token: accessToken,
      user: auth.user,
      is_new: true,
    };
  }

  async linkPhoneViaContact(telegramId: number, phone: string) {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);

    let auth = await this.authRepo.findOne({
      where: { telegram_id: telegramId },
      relations: ['user'],
    });

    if (!auth) {
      return { success: false, message: 'Telegram account not found' };
    }

    const existingAuth = await this.authRepo.findOne({
      where: { phone: normalizedPhone },
    });

    if (existingAuth && existingAuth.id !== auth.id) {
      auth.phone = normalizedPhone;
      auth.is_verified = true;
      await this.authRepo.save(auth);

      if (existingAuth.user && auth.user) {
        existingAuth.user.auth = auth;
        await this.userRepo.save(existingAuth.user);
      }
    } else {
      auth.phone = normalizedPhone;
      auth.is_verified = true;
      await this.authRepo.save(auth);
    }

    return { success: true, message: 'Phone linked successfully' };
  }

  async sendOrderNotification(telegramId: number, order: Order) {
    const statusMessages: Record<string, string> = {
      [OrderStatus.ACCEPTED]: `Buyurtmangiz qabul qilindi!\nBuyurtma raqami: ${order.order_number}`,
      [OrderStatus.READY]: `Buyurtmangiz tayyor!\nBuyurtma raqami: ${order.order_number}\nKuryer tez orada olib ketadi.`,
      [OrderStatus.DELIVERING]: `Buyurtmangiz yo'lda!\nBuyurtma raqami: ${order.order_number}\nKuryer sizga yo'l olgan.`,
      [OrderStatus.DELIVERED]: `Buyurtmangiz yetkazildi!\nBuyurtma raqami: ${order.order_number}\nRahmat!`,
      [OrderStatus.CANCELLED]: `Buyurtmangiz bekor qilindi.\nBuyurtma raqami: ${order.order_number}\nSabab: ${order.cancelled_reason || 'Noma\'lum'}`,
    };

    const message = statusMessages[order.status];
    if (!message) return;

    try {
      await this.bot.api.sendMessage(telegramId, message);
    } catch (error) {
      this.logger.warn(
        `Failed to send notification to ${telegramId}: ${error}`,
      );
    }
  }

  private async handleStart(ctx: Context) {
    const deepLink = this.config.get<string>('TELEGRAM_WEBAPP_URL');
    await ctx.reply(
      'Yaqin Market botiga xush kelibsiz!\n' +
        'Eng yaqin do\'konlardan tez yetkazib berish xizmati.',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🛒 Ilovani ochish',
                web_app: { url: deepLink || 'https://yaqin-market.uz' },
              },
            ],
            [{ text: '📋 Buyurtmalarim', callback_data: 'my_orders' }],
          ],
        },
      },
    );
  }

  private async handleMyOrders(ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const telegram = await this.telegramRepo.findOne({
      where: { telegram_id: tgId },
      relations: ['user'],
    });

    if (!telegram?.user) {
      await ctx.reply('Iltimos, avval Mini App orqali ro\'yxatdan o\'ting.');
      return;
    }

    const orders = await this.orderRepo.find({
      where: { customer_id: telegram.user.id },
      relations: ['store'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (orders.length === 0) {
      await ctx.reply('Sizda hali buyurtmalar yo\'q.');
      return;
    }

    const text = orders
      .map(
        (o) =>
          `📦 ${o.order_number} - ${o.status}\n🏪 ${o.store?.name || 'N/A'}\n💰 ${o.total_price} so'm`,
      )
      .join('\n\n');

    await ctx.reply(text);
  }

  private async handleHelp(ctx: Context) {
    await ctx.reply(
      'Yaqin Market - Tez yetkazib berish xizmati\n\n' +
        'Buyruqlar:\n' +
        '/start - Ilovani ishga tushirish\n' +
        '/orders - Buyurtmalaringizni ko\'rish\n' +
        '/help - Yordam',
    );
  }

  private async handleWebAppData(ctx: Context) {
    const webAppData = (ctx.message as any)?.web_app_data;
    if (!webAppData) return;

    try {
      const data = JSON.parse(webAppData.data);
      if (data.type === 'contact_shared' && data.phone) {
        await this.linkPhoneViaContact(ctx.from!.id, data.phone);
        await ctx.reply('Telefon raqamingiz muvaffaqiyatli bog\'landi!');
      }
    } catch {
      this.logger.warn('Failed to parse web app data');
    }
  }

  private signAccessToken(auth: Auth) {
    return this.jwtService.sign(
      {
        id: auth.id,
        role: auth.role,
        type: JwtTypeEnum.ACCESS,
      },
      { expiresIn: '30d' },
    );
  }
}
