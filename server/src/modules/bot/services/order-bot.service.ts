import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderStatus } from '../../order/entities/order.entity';
import { BotService } from '../bot.service';

@Injectable()
export class OrderBotService {
  private readonly logger = new Logger(OrderBotService.name);

  constructor(private readonly botService: BotService) {}

  async sendOrderStatusNotification(telegramId: number, order: Order) {
    const statusMessages: Record<string, string> = {
      [OrderStatus.ACCEPTED]: `Buyurtmangiz qabul qilindi.\nBuyurtma raqami: ${order.order_number}`,
      [OrderStatus.READY]: `Buyurtmangiz tayyor.\nBuyurtma raqami: ${order.order_number}`,
      [OrderStatus.DELIVERING]: `Buyurtmangiz yo'lda.\nBuyurtma raqami: ${order.order_number}`,
      [OrderStatus.DELIVERED]: `Buyurtmangiz yetkazildi.\nBuyurtma raqami: ${order.order_number}`,
      [OrderStatus.CANCELLED]: `Buyurtmangiz bekor qilindi.\nBuyurtma raqami: ${order.order_number}`,
    };

    const message = statusMessages[order.status];
    if (!message) {
      return;
    }

    try {
      await this.botService.getBot().api.sendMessage(telegramId, message);
    } catch (error) {
      this.logger.warn(
        `Failed to send order status to Telegram: ${String(error)}`,
      );
    }
  }
}
