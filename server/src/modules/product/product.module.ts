import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductTax } from './product-tax.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ImageModule } from '../image/image.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductTax]), ImageModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
