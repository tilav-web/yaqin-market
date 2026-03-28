import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Bot, Context, webhookCallback, type PollingOptions } from 'grammy';
import { StartCommand } from './commands/start.command';
import { ContactEvent } from './events/contact.event';
import { WebAppDataEvent } from './events/web-app-data.event';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Bot<Context> | null;
  public webhookCallback?: (req: Request, res: Response) => Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly startCommand: StartCommand,
    private readonly contactEvent: ContactEvent,
    private readonly webAppDataEvent: WebAppDataEvent,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.bot = token ? new Bot<Context>(token) : null;
  }

  async onModuleInit() {
    if (!this.bot) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, bot will not start');
      return;
    }

    this.setupHandlers();
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'help', description: 'Yordam' },
    ]);

    if (this.isDevelopmentMode()) {
      await this.startPollingMode();
      return;
    }

    await this.startWebhookMode();
  }

  getBot() {
    if (!this.bot) {
      throw new Error('Telegram bot is not initialized');
    }

    return this.bot;
  }

  isReady() {
    return Boolean(this.bot && this.webhookCallback);
  }

  getWebhookSecret() {
    return this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? '';
  }

  private isDevelopmentMode() {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  private async startPollingMode() {
    if (!this.bot) {
      return;
    }

    this.webhookCallback = undefined;
    await this.bot.api.deleteWebhook({ drop_pending_updates: true });

    const pollingOptions: PollingOptions = {
      drop_pending_updates: true,
      onStart: () => {
        this.logger.log('Telegram bot started in polling mode');
      },
    };

    void this.bot.start(pollingOptions).catch((error: unknown) => {
      this.logger.error(`Failed to start polling bot: ${String(error)}`);
    });
  }

  private async startWebhookMode() {
    if (!this.bot) {
      return;
    }

    this.webhookCallback = webhookCallback(this.bot, 'express');

    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    const webhookSecret = this.configService.get<string>(
      'TELEGRAM_WEBHOOK_SECRET',
    );
    if (!webhookUrl) {
      this.logger.warn(
        'TELEGRAM_WEBHOOK_URL not set, webhook mode is disabled',
      );
      return;
    }

    await this.bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: true,
      secret_token: webhookSecret || undefined,
    });

    this.logger.log(`Telegram webhook successfully set to: ${webhookUrl}`);
  }

  private setupHandlers() {
    if (!this.bot) return;

    this.startCommand.register(this.bot);
    this.contactEvent.register(this.bot);
    this.webAppDataEvent.register(this.bot);

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        'Yaqin Market boti orqali telefonni tasdiqlab, mini-appga kirishingiz mumkin.',
      );
    });

    this.bot.catch((error) => {
      this.logger.error(`Bot error: ${String(error.error)}`);
    });
  }

  async onModuleDestroy() {
    if (!this.bot || !this.bot.isRunning()) {
      return;
    }

    try {
      await this.bot.stop();
    } catch (error) {
      this.logger.warn(`Failed to stop bot cleanly: ${String(error)}`);
    }
  }
}
