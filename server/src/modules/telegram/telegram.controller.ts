import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Post('auth')
  async telegramAuth(@Body('init_data') initData: string) {
    if (!initData) {
      throw new BadRequestException('init_data is required');
    }

    return this.telegramBotService.authenticateViaTelegram(initData);
  }

  @Post('link-phone')
  async linkPhone(
    @Body('telegram_id') telegramId: number,
    @Body('phone') phone: string,
  ) {
    if (!telegramId || !phone) {
      throw new BadRequestException('telegram_id and phone are required');
    }

    return this.telegramBotService.linkPhoneViaContact(telegramId, phone);
  }
}
