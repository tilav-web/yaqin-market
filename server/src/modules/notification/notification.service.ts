import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseInitialized = false;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

  async sendToUser(userId: string, payload: PushNotificationPayload) {
    if (!this.firebaseInitialized) return;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcm_token'],
    });

    if (!user?.fcm_token) return;

    await this.sendToToken(user.fcm_token, payload);
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload) {
    if (!this.firebaseInitialized || userIds.length === 0) return;

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
}
