import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from './order.service';

/**
 * 24 soatdan ko'p PENDING holatida turgan qaytim so'rovlarini
 * avtomatik CONFIRMED ga o'tkazadi (happy path default).
 */
@Injectable()
export class OrderChangeCronService {
  private readonly logger = new Logger(OrderChangeCronService.name);

  constructor(private readonly orderService: OrderService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async autoConfirmPendingChanges() {
    try {
      const result = await this.orderService.autoConfirmPendingChanges();
      if (result.processed > 0) {
        this.logger.log(
          `Auto-confirmed ${result.processed} pending change requests`,
        );
      }
    } catch (err) {
      this.logger.error('Auto-confirm cron failed', err);
    }
  }
}
