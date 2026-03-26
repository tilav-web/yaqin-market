import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Telegram } from './uset-telegram.entity';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/entities/order.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Telegram, Auth, User, Order]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [TelegramController],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramModule {}
