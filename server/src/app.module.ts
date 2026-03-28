import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { ImageModule } from './modules/image/image.module';
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
import { ApplicationModule } from './modules/application/application.module';
import { BotModule } from './modules/bot/bot.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const synchronize =
          config.get<string>('DB_SYNCHRONIZE') ??
          String(config.get('NODE_ENV') === 'development');
        const logging =
          config.get<string>('DB_LOGGING') ??
          String(config.get('NODE_ENV') === 'development');

        return {
          type: 'postgres' as const,
          host: config.get<string>('POSTGRES_HOST'),
          port: Number(config.get<string>('POSTGRES_PORT')),
          username: config.get<string>('POSTGRES_USER'),
          password: config.get<string>('POSTGRES_PASSWORD'),
          database: config.get<string>('POSTGRES_DB'),
          autoLoadEntities: true,
          synchronize: synchronize === 'true',
          logging: logging === 'true',
        };
      },
    }),
    RedisModule,
    ImageModule,
    BotModule,
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
    ApplicationModule,
    HealthModule,
  ],
})
export class AppModule {}
