import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { JwtTypeEnum } from 'src/enums/jwt-type.enum';
import { NotificationService } from '../notification/notification.service';

type BroadcastSocketPayload = {
  token?: string;
};

type CourierLocationPayload = {
  token?: string;
  order_id: string;
  lat: number;
  lng: number;
};

@WebSocketGateway({
  namespace: '/broadcast',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class BroadcastGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** Har buyurtma uchun "kuryer yaqin" push yuborilganini kuzatish (memory cache) */
  private readonly courierNearNotified = new Set<string>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly notificationService: NotificationService,
  ) {}

  /** Haversine — metrda masofa */
  private calcDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async notifyIfCourierNear(
    orderId: string,
    courierLat: number,
    courierLng: number,
  ) {
    if (this.courierNearNotified.has(orderId)) return;

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      select: ['id', 'customer_id', 'delivery_lat', 'delivery_lng', 'status'],
    });
    if (!order || order.status !== OrderStatus.DELIVERING) return;
    if (order.delivery_lat == null || order.delivery_lng == null) return;

    const distance = this.calcDistance(
      courierLat,
      courierLng,
      Number(order.delivery_lat),
      Number(order.delivery_lng),
    );

    if (distance > 500) return; // hali uzoq

    this.courierNearNotified.add(orderId);
    // 1 soatdan keyin set'dan o'chirish (RAM tozaligi uchun)
    setTimeout(() => this.courierNearNotified.delete(orderId), 60 * 60 * 1000);

    void this.notificationService.sendToUser(order.customer_id, {
      title: '🛵 Kuryer yaqinlashmoqda',
      body: `Kuryer sizga ${Math.round(distance)} metr qoldi — tayyor turing`,
      data: { order_id: orderId, type: 'COURIER_NEAR' },
    });
  }

  handleConnection(client: Socket) {
    void client;
  }

  handleDisconnect(client: Socket) {
    void client;
  }

  @SubscribeMessage('seller:subscribe')
  async handleSellerSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BroadcastSocketPayload,
  ) {
    const auth = await this.resolveAuth(payload?.token);

    if (
      auth.role !== AuthRoleEnum.SELLER &&
      auth.role !== AuthRoleEnum.SUPER_ADMIN
    ) {
      throw new WsException('Seller access required');
    }

    const sellerId = auth.user?.id;
    if (!sellerId) {
      throw new WsException('Seller user not found');
    }

    await client.join(this.getSellerRoom(sellerId));

    return {
      success: true,
      room: this.getSellerRoom(sellerId),
    };
  }

  @SubscribeMessage('customer:subscribe')
  async handleCustomerSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BroadcastSocketPayload,
  ) {
    const auth = await this.resolveAuth(payload?.token);

    if (
      auth.role !== AuthRoleEnum.CUSTOMER &&
      auth.role !== AuthRoleEnum.SELLER &&
      auth.role !== AuthRoleEnum.COURIER &&
      auth.role !== AuthRoleEnum.SUPER_ADMIN
    ) {
      throw new WsException('Customer app access required');
    }

    const customerId = auth.user?.id;
    if (!customerId) {
      throw new WsException('Customer user not found');
    }

    await client.join(this.getCustomerRoom(customerId));

    return {
      success: true,
      room: this.getCustomerRoom(customerId),
    };
  }

  @SubscribeMessage('courier:subscribe')
  async handleCourierSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BroadcastSocketPayload,
  ) {
    const auth = await this.resolveAuth(payload?.token);

    if (
      auth.role !== AuthRoleEnum.COURIER &&
      auth.role !== AuthRoleEnum.SUPER_ADMIN
    ) {
      throw new WsException('Courier access required');
    }

    const courierId = auth.user?.id;
    if (!courierId) throw new WsException('Courier user not found');

    await client.join(this.getCourierRoom(courierId));

    return { success: true, room: this.getCourierRoom(courierId) };
  }

  // Courier sends their location, customer receives it
  @SubscribeMessage('courier:update-location')
  async handleCourierLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CourierLocationPayload,
  ) {
    const auth = await this.resolveAuth(payload?.token);

    if (
      auth.role !== AuthRoleEnum.COURIER &&
      auth.role !== AuthRoleEnum.SUPER_ADMIN
    ) {
      throw new WsException('Courier access required');
    }

    const courierId = auth.user?.id;
    if (!courierId) throw new WsException('Courier user not found');

    // Persist location to DB
    await this.userRepo.update(courierId, {
      current_lat: payload.lat,
      current_lng: payload.lng,
      last_location_update: new Date(),
    });

    // Broadcast to the order's customer room
    this.server
      .to(`order:${payload.order_id}`)
      .emit('courier:location-changed', {
        order_id: payload.order_id,
        courier_id: courierId,
        lat: payload.lat,
        lng: payload.lng,
        updated_at: new Date().toISOString(),
      });

    // Kuryer yaqinlashmoqda — 500m ichiga kirsa customer'ga push (bir martagina)
    void this.notifyIfCourierNear(payload.order_id, payload.lat, payload.lng);

    return { success: true };
  }

  // Subscribe to a specific order's updates (customer or seller)
  @SubscribeMessage('order:subscribe')
  async handleOrderSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { token?: string; order_id: string },
  ) {
    await this.resolveAuth(payload?.token);
    await client.join(`order:${payload.order_id}`);
    return { success: true };
  }

  // ─── Emit helpers ────────────────────────────────────────────────

  emitToSellerUser(sellerId: string, event: string, payload: unknown) {
    this.server.to(this.getSellerRoom(sellerId)).emit(event, payload);
  }

  emitToCustomerUser(customerId: string, event: string, payload: unknown) {
    this.server.to(this.getCustomerRoom(customerId)).emit(event, payload);
  }

  emitToCourierUser(courierId: string, event: string, payload: unknown) {
    this.server.to(this.getCourierRoom(courierId)).emit(event, payload);
  }

  emitToOrder(orderId: string, event: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit(event, payload);
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private getSellerRoom(sellerId: string) {
    return `seller:${sellerId}`;
  }

  private getCustomerRoom(customerId: string) {
    return `customer:${customerId}`;
  }

  private getCourierRoom(courierId: string) {
    return `courier:${courierId}`;
  }

  private async resolveAuth(token?: string) {
    if (!token) {
      throw new WsException('Token required');
    }

    let payload: {
      id: string;
      role: AuthRoleEnum;
      type: JwtTypeEnum;
    };

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new WsException('Invalid token');
    }

    if (payload.type !== JwtTypeEnum.ACCESS || !payload.id) {
      throw new WsException('Invalid access token');
    }

    const auth = await this.authRepo.findOne({
      where: { id: payload.id },
      relations: {
        user: {
          stores: true,
        },
      },
    });

    if (!auth?.user) {
      throw new WsException('User not found');
    }

    return auth;
  }
}
