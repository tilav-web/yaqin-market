import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/start-conversation.dto';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '') ?? '');

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // cleanup if needed
  }

  /** Suhbat xonasiga qo'shilish */
  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId: string = client.data.userId;
    try {
      await this.chatService.getConversation(data.conversation_id, userId);
      client.join(`conv:${data.conversation_id}`);
      client.emit('chat:joined', { conversation_id: data.conversation_id });
    } catch (e) {
      client.emit('chat:error', { message: (e as Error).message });
    }
  }

  /** Xabar yuborish */
  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string; content: string },
  ) {
    const userId: string = client.data.userId;
    try {
      const dto: SendMessageDto = { content: data.content };
      const message = await this.chatService.sendMessage(data.conversation_id, userId, dto);

      // Xona a'zolariga yuborish
      this.server.to(`conv:${data.conversation_id}`).emit('chat:message', message);

      // Offline foydalanuvchiga ham (user xonasiga)
      const conv = await this.chatService.getConversation(data.conversation_id, userId);
      const recipientId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
      this.server.to(`user:${recipientId}`).emit('chat:notification', {
        conversation_id: data.conversation_id,
        preview: message.content.slice(0, 80),
        sender_id: userId,
      });
    } catch (e) {
      client.emit('chat:error', { message: (e as Error).message });
    }
  }

  /** Yozilmoqda indikatori */
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string; is_typing: boolean },
  ) {
    client.to(`conv:${data.conversation_id}`).emit('chat:typing', {
      user_id: client.data.userId,
      is_typing: data.is_typing,
    });
  }

  /** Xabarlarni o'qilgan qilish */
  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId: string = client.data.userId;
    try {
      await this.chatService.getMessages(data.conversation_id, userId, 1, 1);
      client.to(`conv:${data.conversation_id}`).emit('chat:read', {
        conversation_id: data.conversation_id,
        reader_id: userId,
      });
    } catch (e) {
      client.emit('chat:error', { message: (e as Error).message });
    }
  }

  /** Tashqaridan xabar yuborish (masalan, order status o'zgarganda) */
  emitToConversation(convId: string, event: string, data: unknown) {
    this.server.to(`conv:${convId}`).emit(event, data);
  }
}
