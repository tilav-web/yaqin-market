import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { ImageModule } from './modules/image/image.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { CategoryModule } from './modules/category/category.module';
import { StoreModule } from './modules/store/store.module';
import { StoreProductModule } from './modules/store-product/store-product.module';
import { OrderModule } from './modules/order/order.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { UnitModule } from './modules/unit/unit.module';
import { LocationModule } from './modules/location/location.module';
import { ReviewModule } from './modules/review/review.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST'),
        port: Number(config.get('POSTGRES_PORT')),
        username: config.get('POSTGRES_USER'),
        password: config.get('POSTGRES_PASSWORD'),
        database: config.get('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    RedisModule,
    ImageModule,
    TelegramModule,
    AuthModule,
    UserModule,
    CategoryModule,
    ProductModule,
    UnitModule,
    LocationModule,
    StoreModule,
    StoreProductModule,
    OrderModule,
    ReviewModule,
    WalletModule,
    PaymentModule,
  ],
})
export class AppModule {}
