import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Notification, NotificationType } from './notification.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import {
  BroadcastNotificationDto,
  BroadcastTarget,
} from './dto/broadcast-notification.dto';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
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
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
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

    const tokens = users.map((u) => u.fcm_token).filter(Boolean) as string[];

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
    const limit = Math.min(
      50,
      Math.max(1, Math.floor(Number(params.limit) || 20)),
    );

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

  // ─── Admin broadcast ────────────────────────────────────────────────────

  /**
   * Admin broadcast: tanlangan target guruhiga (va filter'larga mos) push + DB.
   * Katta batch'larda xavfsiz ishlashi uchun FCM yuborishni chunk'larga bo'ladi.
   */
  async broadcast(dto: BroadcastNotificationDto) {
    const targetUserIds = await this.resolveBroadcastTargets(dto);

    if (targetUserIds.length === 0) {
      return { matched: 0, sent: 0, dry_run: !!dto.dry_run };
    }

    if (dto.dry_run) {
      return { matched: targetUserIds.length, sent: 0, dry_run: true };
    }

    const payload = {
      title: dto.title,
      body: dto.body,
      data: {
        ...(dto.data ?? {}),
        type: dto.data?.type ?? 'BROADCAST_ADMIN',
      },
    };

    const BATCH = 500;
    let sent = 0;
    for (let i = 0; i < targetUserIds.length; i += BATCH) {
      const chunk = targetUserIds.slice(i, i + BATCH);
      await this.sendToUsers(chunk, payload);
      sent += chunk.length;
    }

    return { matched: targetUserIds.length, sent, dry_run: false };
  }

  /**
   * Broadcast uchun user ro'yxatini filter bo'yicha topadi.
   * Alohida metod — admin panelda "preview" uchun ham ishlatilishi mumkin.
   */
  async previewBroadcastTargets(dto: BroadcastNotificationDto) {
    const ids = await this.resolveBroadcastTargets(dto);
    return { count: ids.length };
  }

  private async resolveBroadcastTargets(
    dto: BroadcastNotificationDto,
  ): Promise<string[]> {
    // SPECIFIC → to'g'ridan-to'g'ri ro'yxat
    if (dto.target === BroadcastTarget.SPECIFIC) {
      if (!dto.user_ids || dto.user_ids.length === 0) return [];
      // valid user_id'larni tekshiramiz
      const found = await this.userRepo
        .createQueryBuilder('u')
        .select('u.id', 'id')
        .whereInIds(dto.user_ids)
        .getRawMany<{ id: string }>();
      return found.map((f) => f.id);
    }

    // Role → targetga ko'ra aniqlanadi yoki DTO'dan keladi
    const roles = dto.roles ?? this.targetRoles(dto.target);

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.auth', 'a')
      .select('u.id', 'id');

    if (roles.length > 0) {
      qb.andWhere('a.role IN (:...roles)', { roles });
    }

    if (dto.only_with_token) {
      qb.andWhere('u.fcm_token IS NOT NULL');
    }

    if (dto.active_last_days && dto.active_last_days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - dto.active_last_days);
      qb.andWhere('u.updatedAt >= :since', { since });
    }

    let userIds = (await qb.getRawMany<{ id: string }>()).map((r) => r.id);

    // min_delivered_orders — alohida query (customer'lar uchun mantiqli)
    if (dto.min_delivered_orders && dto.min_delivered_orders > 0) {
      const rows = await this.orderRepo
        .createQueryBuilder('o')
        .select('o.customer_id', 'customer_id')
        .addSelect('COUNT(o.id)', 'cnt')
        .where('o.status = :st', { st: OrderStatus.DELIVERED })
        .andWhere('o.customer_id IN (:...uids)', { uids: userIds.length ? userIds : [''] })
        .groupBy('o.customer_id')
        .having('COUNT(o.id) >= :mn', { mn: dto.min_delivered_orders })
        .getRawMany<{ customer_id: string; cnt: string }>();

      const qualifying = new Set(rows.map((r) => r.customer_id));
      userIds = userIds.filter((id) => qualifying.has(id));
    }

    return userIds;
  }

  private targetRoles(target: BroadcastTarget): AuthRoleEnum[] {
    switch (target) {
      case BroadcastTarget.CUSTOMERS:
        return [AuthRoleEnum.CUSTOMER];
      case BroadcastTarget.SELLERS:
        return [AuthRoleEnum.SELLER];
      case BroadcastTarget.COURIERS:
        return [AuthRoleEnum.COURIER];
      case BroadcastTarget.ALL:
      default:
        return [
          AuthRoleEnum.CUSTOMER,
          AuthRoleEnum.SELLER,
          AuthRoleEnum.COURIER,
        ];
    }
  }
}
