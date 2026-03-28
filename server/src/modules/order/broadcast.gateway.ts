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
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { JwtTypeEnum } from 'src/enums/jwt-type.enum';

type BroadcastSocketPayload = {
  token?: string;
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

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
  ) {}

  handleConnection(_client: Socket) {}

  handleDisconnect(_client: Socket) {}

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

    client.join(this.getSellerRoom(sellerId));

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

    client.join(this.getCustomerRoom(customerId));

    return {
      success: true,
      room: this.getCustomerRoom(customerId),
    };
  }

  emitToSellerUser(sellerId: string, event: string, payload: unknown) {
    this.server.to(this.getSellerRoom(sellerId)).emit(event, payload);
  }

  emitToCustomerUser(customerId: string, event: string, payload: unknown) {
    this.server.to(this.getCustomerRoom(customerId)).emit(event, payload);
  }

  private getSellerRoom(sellerId: string) {
    return `seller:${sellerId}`;
  }

  private getCustomerRoom(customerId: string) {
    return `customer:${customerId}`;
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
