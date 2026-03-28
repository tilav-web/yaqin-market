import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { BotAuthService } from '../services/bot-auth.service';
import { BotKeyboards } from '../keyboards/bot.keyboards';

@Injectable()
export class StartCommand {
  constructor(
    @Inject(forwardRef(() => BotAuthService))
    private readonly botAuthService: BotAuthService,
    private readonly keyboards: BotKeyboards,
  ) {}

  register(bot: Bot<Context>) {
    bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id;
      const accountStatus = telegramId
        ? await this.botAuthService.getTelegramAccountStatus(telegramId)
        : { hasVerifiedPhone: false };
      const webAppUrl = this.botAuthService.getWebAppUrl();

      await ctx.reply(
        accountStatus.hasVerifiedPhone
          ? 'Yaqin Marketga qaytganingizdan xursandmiz. Mini-appni ochib davom etishingiz mumkin.'
          : 'Assalomu alaykum. Yaqin Marketdan foydalanish uchun telefon raqamingizni Telegram orqali tasdiqlang yoki mini-appni oching.',
        {
          reply_markup:
            this.keyboards.buildLinkedAccountInlineKeyboard(webAppUrl),
        },
      );

      if (!accountStatus.hasVerifiedPhone) {
        await ctx.reply(
          "Telefon raqamingizni yuboring. Bu Telegram tomonidan tasdiqlangan telefon bo'ladi.",
          {
            reply_markup: this.keyboards.buildContactRequestKeyboard(),
          },
        );
      }
    });
  }
}
