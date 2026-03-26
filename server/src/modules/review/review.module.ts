import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { Store } from '../store/entities/store.entity';
import { Order } from '../order/entities/order.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Store, Order])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
