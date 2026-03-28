import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { BotAuthService } from '../services/bot-auth.service';
import { BotKeyboards } from '../keyboards/bot.keyboards';

@Injectable()
export class ContactEvent {
  private readonly logger = new Logger(ContactEvent.name);

  constructor(
    @Inject(forwardRef(() => BotAuthService))
    private readonly botAuthService: BotAuthService,
    private readonly keyboards: BotKeyboards,
  ) {}

  register(bot: Bot<Context>) {
    bot.on('message:contact', async (ctx) => {
      const telegramId = ctx.from?.id;
      const contact = ctx.message.contact;

      if (!telegramId) {
        await ctx.reply("Telegram foydalanuvchi ma'lumoti topilmadi.");
        return;
      }

      if (contact.user_id && contact.user_id !== telegramId) {
        await ctx.reply(
          "Faqat o'zingizning telefon raqamingizni yuborishingiz mumkin.",
        );
        return;
      }

      try {
        const result = await this.botAuthService.linkVerifiedTelegramContact({
          telegramId,
          username: ctx.from?.username ?? null,
          firstName: ctx.from?.first_name ?? null,
          lastName: ctx.from?.last_name ?? null,
          phone: contact.phone_number,
        });

        await ctx.reply(result.message, {
          reply_markup: this.keyboards.removeKeyboard(),
        });

        await ctx.reply('Endi mini-appni ochib davom etishingiz mumkin.', {
          reply_markup: this.keyboards.buildOpenWebAppInlineKeyboard(
            this.botAuthService.getWebAppUrl(),
          ),
        });
      } catch (error) {
        this.logger.warn(`Failed to link Telegram contact: ${String(error)}`);
        await ctx.reply(
          error instanceof Error
            ? error.message
            : "Telefonni bog'lashda xatolik yuz berdi.",
        );
      }
    });
  }
}
