import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreProduct } from './store-product.entity';
import { Store } from '../store/entities/store.entity';
import { StoreSubscription } from '../store/entities/store-subscription.entity';
import { StoreProductService } from './store-product.service';
import { StoreProductController } from './store-product.controller';
import { StoreSubscriptionService } from '../store/store-subscription.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreProduct, Store, StoreSubscription]),
    NotificationModule,
  ],
  controllers: [StoreProductController],
  providers: [StoreProductService, StoreSubscriptionService],
  exports: [StoreProductService],
})
export class StoreProductModule {}
