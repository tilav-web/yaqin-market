import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { StoreDeliverySettings } from './entities/store-delivery-settings.entity';
import { StoreWorkingHour } from './entities/store-working-hour.entity';
import { StoreService } from './store.service';
import { StoreServiceController } from './store.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreDeliverySettings, StoreWorkingHour]),
  ],
  controllers: [StoreServiceController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
