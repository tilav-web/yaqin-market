import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Store } from '../store/entities/store.entity';
import { StoreProduct } from '../store-product/store-product.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Product } from '../product/product.entity';
import { BroadcastRequest } from './entities/broadcast-request.entity';
import { BroadcastRequestItem } from './entities/broadcast-request-item.entity';
import { BroadcastOffer } from './entities/broadcast-offer.entity';
import { BroadcastOfferItem } from './entities/broadcast-offer-item.entity';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { BroadcastGateway } from './broadcast.gateway';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';
import { OrderChangeCronService } from './order-change-cron.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Store,
      StoreProduct,
      Product,
      Auth,
      User,
      BroadcastRequest,
      BroadcastRequestItem,
      BroadcastOffer,
      BroadcastOfferItem,
    ]),
    NotificationModule,
    WalletModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    RolesGuard,
    BroadcastGateway,
    OrderChangeCronService,
  ],
  exports: [OrderService],
})
export class OrderModule {}
