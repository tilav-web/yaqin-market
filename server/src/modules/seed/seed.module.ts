import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from '../auth/auth.entity';
import { Category } from '../category/category.entity';
import { Location } from '../location/location.entity';
import { Product } from '../product/product.entity';
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
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST') ?? 'localhost',
        port: Number(config.get<string>('POSTGRES_PORT') ?? 5432),
        username: config.get<string>('POSTGRES_USER') ?? 'postgres',
        password: config.get<string>('POSTGRES_PASSWORD') ?? 'postgres',
        database: config.get<string>('POSTGRES_DB') ?? 'postgres',
        entities: [
          Auth,
          User,
          Wallet,
          Location,
          Category,
          Unit,
          Product,
          Store,
          StoreDeliverySettings,
          StoreWorkingHour,
          StoreProduct,
          Telegram,
        ],
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        logging: false,
      }),
    }),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
