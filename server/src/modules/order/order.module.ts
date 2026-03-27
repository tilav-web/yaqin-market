import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Store,
      StoreProduct,
      Product,
      BroadcastRequest,
      BroadcastRequestItem,
      BroadcastOffer,
      BroadcastOfferItem,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, RolesGuard],
  exports: [OrderService],
})
export class OrderModule {}
