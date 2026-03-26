import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreProduct } from './store-product.entity';
import { StoreProductService } from './store-product.service';
import { StoreProductController } from './store-product.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoreProduct])],
  controllers: [StoreProductController],
  providers: [StoreProductService],
  exports: [StoreProductService],
})
export class StoreProductModule {}
