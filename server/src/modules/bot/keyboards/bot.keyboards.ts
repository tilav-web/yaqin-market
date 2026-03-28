import { Injectable } from '@nestjs/common';
import { Keyboard } from 'grammy';

@Injectable()
export class BotKeyboards {
  buildContactRequestKeyboard() {
    return new Keyboard()
      .requestContact('📱 Telefon raqamni yuborish')
      .resized()
      .oneTime();
  }

  buildOpenWebAppInlineKeyboard(url: string) {
    return {
      inline_keyboard: [
        [
          {
            text: '🛒 Yaqin Marketni ochish',
            web_app: { url },
          },
        ],
      ],
    };
  }

  buildLinkedAccountInlineKeyboard(url: string) {
    return {
      inline_keyboard: [
        [
          {
            text: '✅ Mini-appni ochish',
            web_app: { url },
          },
        ],
      ],
    };
  }

  removeKeyboard() {
    return {
      remove_keyboard: true as const,
    };
  }
}
