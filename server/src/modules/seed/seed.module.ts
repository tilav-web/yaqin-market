import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from '../auth/auth.entity';
import { SellerLegal } from '../application/seller-legal.entity';
import { Category } from '../category/category.entity';
import { Location } from '../location/location.entity';
import { Product } from '../product/product.entity';
import { ProductTax } from '../product/product-tax.entity';
import { StoreProduct } from '../store-product/store-product.entity';
import { StoreDeliverySettings } from '../store/entities/store-delivery-settings.entity';
import { StoreWorkingHour } from '../store/entities/store-working-hour.entity';
import { Store } from '../store/entities/store.entity';
import { Telegram } from '../telegram/uset-telegram.entity';
import { Unit } from '../unit/unit.entity';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { SeedService } from './seed.service';

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
        const logging = config.get<string>('DB_LOGGING') ?? 'false';

        return {
          type: 'postgres' as const,
          host: config.get<string>('POSTGRES_HOST') ?? 'localhost',
          port: Number(config.get<string>('POSTGRES_PORT') ?? 5432),
          username: config.get<string>('POSTGRES_USER') ?? 'postgres',
          password: config.get<string>('POSTGRES_PASSWORD') ?? 'postgres',
          database: config.get<string>('POSTGRES_DB') ?? 'postgres',
          entities: [
            Auth,
            SellerLegal,
            User,
            Wallet,
            Location,
            Category,
            Unit,
            Product,
            ProductTax,
            Store,
            StoreDeliverySettings,
            StoreWorkingHour,
            StoreProduct,
            Telegram,
          ],
          autoLoadEntities: true,
          synchronize: synchronize === 'true',
          logging: logging === 'true',
        };
      },
    }),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
