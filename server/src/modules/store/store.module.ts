import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { StoreDeliverySettings } from './entities/store-delivery-settings.entity';
import { StoreWorkingHour } from './entities/store-working-hour.entity';
import { StoreSubscription } from './entities/store-subscription.entity';
import { StoreService } from './store.service';
import { StoreServiceController } from './store.controller';
import { StoreSubscriptionService } from './store-subscription.service';
import { StoreSubscriptionController } from './store-subscription.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Store,
      StoreDeliverySettings,
      StoreWorkingHour,
      StoreSubscription,
    ]),
    NotificationModule,
  ],
  controllers: [StoreServiceController, StoreSubscriptionController],
  providers: [StoreService, StoreSubscriptionService],
  exports: [StoreService, StoreSubscriptionService],
})
export class StoreModule {}
