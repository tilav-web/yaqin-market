import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreSubscription } from './entities/store-subscription.entity';
import { NotificationService } from '../notification/notification.service';
import { User } from '../user/user.entity';

@Injectable()
export class StoreSubscriptionService {
  constructor(
    @InjectRepository(StoreSubscription)
    private readonly repo: Repository<StoreSubscription>,
    private readonly notificationService: NotificationService,
  ) {}

  async subscribe(userId: string, storeId: string) {
    const existing = await this.repo.findOne({
      where: { user_id: userId, store_id: storeId },
    });

    if (existing) {
      throw new ConflictException('Already subscribed to this store');
    }

    const subscription = this.repo.create({
      user_id: userId,
      store_id: storeId,
    });
    return this.repo.save(subscription);
  }

  async unsubscribe(userId: string, storeId: string) {
    const subscription = await this.repo.findOne({
      where: { user_id: userId, store_id: storeId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.repo.remove(subscription);
    return { success: true };
  }

  async getMySubscriptions(userId: string) {
    return this.repo.find({
      where: { user_id: userId },
      relations: ['store'],
      order: { createdAt: 'DESC' },
    });
  }

  async isSubscribed(userId: string, storeId: string): Promise<boolean> {
    const sub = await this.repo.findOne({
      where: { user_id: userId, store_id: storeId },
    });
    return !!sub;
  }

  /** Do'konga yangi mahsulot qo'shilganda barcha obunachilarga bildirishnoma yuboradi */
  async notifySubscribers(
    storeId: string,
    storeName: string,
    productName: string,
  ) {
    const subscriptions = await this.repo.find({
      where: { store_id: storeId },
      relations: ['user'],
    });

    if (!subscriptions.length) return;

    const userIds = subscriptions.map((s) => s.user_id);

    await this.notificationService.sendToUsers(userIds, {
      title: `${storeName} — yangi mahsulot`,
      body: productName,
      data: { type: 'new_product', store_id: storeId },
    });
  }
}
