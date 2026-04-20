import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import {
  StartConversationDto,
  SendMessageDto,
} from './dto/start-conversation.dto';
import { Order } from '../order/entities/order.entity';
import { BroadcastOffer } from '../order/entities/broadcast-offer.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(BroadcastOffer)
    private readonly offerRepo: Repository<BroadcastOffer>,
    private readonly notificationService: NotificationService,
  ) {}

  /** Suhbat boshlash yoki mavjudini qaytarish */
  async startOrGetConversation(
    buyerId: string,
    dto: StartConversationDto,
  ): Promise<Conversation> {
    let sellerId = dto.seller_id;

    // ORDER uchun — seller ni orderdan topamiz
    if (dto.type === ConversationType.ORDER && dto.reference_id) {
      const order = await this.orderRepo.findOne({
        where: { id: dto.reference_id },
        relations: ['store', 'store.owner'],
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.customer_id !== buyerId) throw new ForbiddenException();
      sellerId = order.store?.owner?.id;
    }

    // BROADCAST uchun — seller ni offerdan topamiz
    if (dto.type === ConversationType.BROADCAST && dto.reference_id) {
      const offer = await this.offerRepo.findOne({
        where: { id: dto.reference_id },
        relations: ['seller'],
      });
      if (!offer) throw new NotFoundException('Broadcast offer not found');
      sellerId = offer.seller?.id ?? offer.seller_id ?? undefined;
    }

    if (!sellerId) throw new BadRequestException('seller_id required');

    // Mavjud suhbatni qaytarish
    const existing = await this.convRepo.findOne({
      where: {
        type: dto.type,
        reference_id: dto.reference_id ?? undefined,
        buyer_id: buyerId,
        seller_id: sellerId,
      },
    });

    if (existing) return existing;

    const conv = this.convRepo.create({
      type: dto.type,
      reference_id: dto.reference_id ?? null,
      buyer_id: buyerId,
      seller_id: sellerId,
    });

    return this.convRepo.save(conv);
  }

  async getMyConversations(userId: string) {
    return this.convRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.buyer', 'buyer')
      .leftJoinAndSelect('conv.seller', 'seller')
      .where('conv.buyer_id = :userId OR conv.seller_id = :userId', { userId })
      .orderBy('conv.last_message_at', 'DESC', 'NULLS LAST')
      .addOrderBy('conv.createdAt', 'DESC')
      .getMany();
  }

  async getConversation(convId: string, userId: string): Promise<Conversation> {
    const conv = await this.convRepo.findOne({
      where: { id: convId },
      relations: ['buyer', 'seller'],
    });

    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      throw new ForbiddenException();
    }

    return conv;
  }

  async getMessages(convId: string, userId: string, page = 1, limit = 30) {
    await this.getConversation(convId, userId);

    const [items, total] = await this.msgRepo.findAndCount({
      where: { conversation_id: convId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // O'qilmagan xabarlarni belgilash
    const unread = items.filter((m) => !m.read_at && m.sender_id !== userId);
    if (unread.length) {
      const ids = unread.map((m) => m.id);
      await this.msgRepo
        .createQueryBuilder()
        .update(Message)
        .set({ read_at: new Date() })
        .whereInIds(ids)
        .execute();

      // Unread counter ni yangilash
      const conv = await this.convRepo.findOne({ where: { id: convId } });
      if (conv) {
        if (conv.buyer_id === userId) conv.unread_buyer = 0;
        else conv.unread_seller = 0;
        await this.convRepo.save(conv);
      }
    }

    return { items: items.reverse(), total, page, limit };
  }

  async sendMessage(
    convId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const conv = await this.getConversation(convId, senderId);

    const msg = this.msgRepo.create({
      conversation_id: convId,
      sender_id: senderId,
      content: dto.content.trim(),
    });

    const saved = await this.msgRepo.save(msg);

    // Conversation meta ni yangilash
    conv.last_message_preview = dto.content.trim().slice(0, 100);
    conv.last_message_at = saved.createdAt;

    // Qabul qiluvchining unread counter ni oshirish
    if (senderId === conv.buyer_id) conv.unread_seller += 1;
    else conv.unread_buyer += 1;

    await this.convRepo.save(conv);

    // Qabul qiluvchiga push notification
    const recipientId =
      senderId === conv.buyer_id ? conv.seller_id : conv.buyer_id;
    if (recipientId) {
      const preview = dto.content.trim().slice(0, 80);
      void this.notificationService.sendToUser(recipientId, {
        title: '💬 Yangi xabar',
        body: preview,
        data: {
          type: 'CHAT_MESSAGE',
          conversation_id: convId,
        },
      });
    }

    return this.msgRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    }) as Promise<Message>;
  }

  async getUnreadCount(userId: string): Promise<{ total: number }> {
    const result = await this.convRepo
      .createQueryBuilder('conv')
      .select(
        'SUM(CASE WHEN conv.buyer_id = :uid THEN conv.unread_buyer ELSE conv.unread_seller END)',
        'total',
      )
      .where('conv.buyer_id = :uid OR conv.seller_id = :uid', { uid: userId })
      .getRawOne<{ total: string | null }>();

    return { total: parseInt(result?.total || '0', 10) };
  }
}
