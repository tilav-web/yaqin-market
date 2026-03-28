import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { BotAuthService } from '../services/bot-auth.service';

@Injectable()
export class WebAppDataEvent {
  private readonly logger = new Logger(WebAppDataEvent.name);

  constructor(
    @Inject(forwardRef(() => BotAuthService))
    private readonly botAuthService: BotAuthService,
  ) {}

  register(bot: Bot<Context>) {
    bot.on('message:web_app_data', async (ctx) => {
      const webAppData = (
        ctx.message as Context['message'] & {
          web_app_data?: { data?: string };
        }
      )?.web_app_data;

      if (!webAppData?.data || !ctx.from?.id) {
        return;
      }

      try {
        const payload = JSON.parse(webAppData.data) as {
          type?: string;
          phone?: string;
        };

        if (payload.type === 'contact_shared' && payload.phone) {
          const result = await this.botAuthService.linkVerifiedTelegramContact({
            telegramId: ctx.from.id,
            username: ctx.from?.username ?? null,
            firstName: ctx.from?.first_name ?? null,
            lastName: ctx.from?.last_name ?? null,
            phone: payload.phone,
          });

          await ctx.reply(result.message);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse web_app_data payload: ${String(error)}`,
        );
      }
    });
  }
}
