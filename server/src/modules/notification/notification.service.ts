import { Injectable, Logger, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Notification, NotificationType } from './notification.entity';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const TYPE_MAP: Record<string, NotificationType> = {
  ORDER_DELIVERED: NotificationType.ORDER,
  ORDER_ACCEPTED: NotificationType.ORDER,
  ORDER_READY: NotificationType.ORDER,
  ORDER_CANCELLED: NotificationType.ORDER,
  COURIER_NEAR: NotificationType.COURIER,
  COURIER_ASSIGNED: NotificationType.COURIER,
  CHAT_MESSAGE: NotificationType.CHAT,
  CHANGE_PENDING: NotificationType.CHANGE,
  CHANGE_CONFIRMED: NotificationType.CHANGE,
  CHANGE_WAIVED: NotificationType.CHANGE,
  CHANGE_DISPUTED: NotificationType.CHANGE,
  CHANGE_RESOLVED: NotificationType.CHANGE,
  CHANGE_AUTO_CONFIRMED: NotificationType.CHANGE,
  LOW_BALANCE: NotificationType.WALLET,
  BALANCE_DEPLETED: NotificationType.WALLET,
  TOPUP: NotificationType.WALLET,
  BROADCAST_REQUEST: NotificationType.BROADCAST,
  BROADCAST_OFFER: NotificationType.BROADCAST,
  REVIEW_REQUEST: NotificationType.REVIEW,
};

function inferType(payload: PushNotificationPayload): NotificationType {
  const t = payload.data?.type;
  if (t && TYPE_MAP[t]) return TYPE_MAP[t];
  return NotificationType.SYSTEM;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseInitialized = false;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        }
        this.firebaseInitialized = true;
        this.logger.log('Firebase Admin initialized');
      } catch (err) {
        this.logger.warn('Firebase Admin init failed: ' + String(err));
      }
    } else {
      this.logger.warn(
        'Firebase env vars not set — push notifications disabled',
      );
    }
  }

  async saveFcmToken(userId: string, token: string) {
    await this.userRepo.update(userId, { fcm_token: token });
    return { success: true };
  }

  /**
   * User'ga push yuboradi VA DB ga history sifatida saqlab qo'yadi.
   * FCM token yo'q bo'lsa ham DB'ga yoziladi — user ilovaga kirganda ko'rishi mumkin.
   */
  async sendToUser(userId: string, payload: PushNotificationPayload) {
    // 1. Avval DB ga yozamiz
    try {
      await this.saveNotification(userId, payload);
    } catch (err) {
      this.logger.warn('Save notification failed: ' + String(err));
    }

    // 2. Push (agar Firebase sozlangan bo'lsa)
    if (!this.firebaseInitialized) return;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcm_token'],
    });

    if (!user?.fcm_token) return;

    await this.sendToToken(user.fcm_token, payload);
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload) {
    if (userIds.length === 0) return;

    // DB ga barchasiga
    await Promise.all(
      userIds.map((id) =>
        this.saveNotification(id, payload).catch((err) =>
          this.logger.warn('Save notification failed: ' + String(err)),
        ),
      ),
    );

    if (!this.firebaseInitialized) return;

    const users = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.fcm_token'])
      .whereInIds(userIds)
      .andWhere('u.fcm_token IS NOT NULL')
      .getMany();

    const tokens = users
      .map((u) => u.fcm_token)
      .filter(Boolean) as string[];

    if (tokens.length === 0) return;

    await this.sendToMultipleTokens(tokens, payload);
  }

  private async saveNotification(
    userId: string,
    payload: PushNotificationPayload,
  ) {
    const type = inferType(payload);
    const notification = this.notificationRepo.create({
      user_id: userId,
      title: payload.title,
      body: payload.body,
      type,
      data: payload.data ?? null,
    });
    await this.notificationRepo.save(notification);
  }

  private async sendToToken(token: string, payload: PushNotificationPayload) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'orders' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
    } catch (err) {
      this.logger.warn(`FCM send failed for token: ${String(err)}`);
    }
  }

  private async sendToMultipleTokens(
    tokens: string[],
    payload: PushNotificationPayload,
  ) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'orders' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
    } catch (err) {
      this.logger.warn(`FCM multicast failed: ${String(err)}`);
    }
  }

  // ─── History API ────────────────────────────────────────────────────────

  async list(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      filter?: 'all' | 'unread';
      type?: NotificationType;
    } = {},
  ) {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(params.limit) || 20)));

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.user_id = :uid', { uid: userId })
      .orderBy('n.createdAt', 'DESC');

    if (params.filter === 'unread') {
      qb.andWhere('n.read_at IS NULL');
    }
    if (params.type) {
      qb.andWhere('n.type = :type', { type: params.type });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
        hasMore: page * limit < total,
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepo.count({
      where: { user_id: userId, read_at: IsNull() },
    });
    return { unread: count };
  }

  async markRead(userId: string, notificationId: string) {
    const notif = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.user_id !== userId) throw new ForbiddenException();
    if (notif.read_at) return notif;

    notif.read_at = new Date();
    return this.notificationRepo.save(notif);
  }

  async markAllRead(userId: string) {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ read_at: new Date() })
      .where('user_id = :uid', { uid: userId })
      .andWhere('read_at IS NULL')
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async delete(userId: string, notificationId: string) {
    const notif = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.user_id !== userId) throw new ForbiddenException();
    await this.notificationRepo.remove(notif);
    return { success: true };
  }

  async deleteAll(userId: string) {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('user_id = :uid', { uid: userId })
      .execute();
    return { deleted: result.affected ?? 0 };
  }
}
