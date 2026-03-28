import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BotService } from './bot.service';
import { BotAuthService } from './services/bot-auth.service';

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly botAuthService: BotAuthService,
  ) {}

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const expectedSecret = this.botService.getWebhookSecret();
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    const headerSecret = Array.isArray(incomingSecret)
      ? incomingSecret[0]
      : incomingSecret;

    if (expectedSecret && headerSecret !== expectedSecret) {
      return res.status(403).send('Invalid webhook secret');
    }

    if (!this.botService.webhookCallback) {
      return res.status(500).send('Webhook callback is not initialized');
    }

    await this.botService.webhookCallback(req, res);
  }

  @Post('webapp/session')
  async createWebAppSession(
    @Headers('x-telegram-init-data') headerInitData: string | undefined,
    @Body('initData') bodyInitData: string | undefined,
    @Body('init_data') legacyBodyInitData: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const initData = headerInitData ?? bodyInitData ?? legacyBodyInitData;

    if (!initData) {
      throw new BadRequestException('Telegram initData is required');
    }

    return this.botAuthService.createWebAppSession({
      initData,
      res,
    });
  }

  @Post('webapp/request-phone')
  async requestPhoneVerification(
    @Headers('x-telegram-init-data') headerInitData: string | undefined,
    @Body('initData') bodyInitData: string | undefined,
    @Body('init_data') legacyBodyInitData: string | undefined,
  ) {
    const initData = headerInitData ?? bodyInitData ?? legacyBodyInitData;

    if (!initData) {
      throw new BadRequestException('Telegram initData is required');
    }

    return this.botAuthService.requestPhoneVerification(initData);
  }
}
