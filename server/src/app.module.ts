import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { Auth } from './modules/auth/auth.entity';
import { Category } from './modules/category/category.entity';
import { Location } from './modules/location/location.entity';
import { Product } from './modules/product/product.entity';
import { Review } from './modules/review/review.entity';
import { Store } from './modules/store/entities/store.entity';
import { Telegram } from './modules/telegram/uset-telegram.entity';
import { Unit } from './modules/unit/unit.entity';
import { User } from './modules/user/user.entity';
import { Wallet } from './modules/wallet/entities/wallet.entity';
import { WalletTransaction } from './modules/wallet/entities/wallet-transaction.entity';

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
        migrations: ['dist/migrations/*.js'],
        migrationsRun: config.get('NODE_ENV') === 'production',
      }),
    }),
    TypeOrmModule.forFeature([
      Auth,
      Category,
      Location,
      Product,
      Review,
      Store,
      Telegram,
      Unit,
      User,
      Wallet,
      WalletTransaction,
    ]),
    RedisModule,
    AuthModule,
  ],
})
export class AppModule {}
