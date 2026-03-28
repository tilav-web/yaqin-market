import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from '../auth/auth.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/entities/order.entity';
import { Telegram } from '../telegram/uset-telegram.entity';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { StartCommand } from './commands/start.command';
import { ContactEvent } from './events/contact.event';
import { WebAppDataEvent } from './events/web-app-data.event';
import { OrderBotService } from './services/order-bot.service';
import { BotAuthService } from './services/bot-auth.service';
import { BotKeyboards } from './keyboards/bot.keyboards';

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
  controllers: [BotController],
  providers: [
    BotService,
    BotAuthService,
    BotKeyboards,
    StartCommand,
    ContactEvent,
    WebAppDataEvent,
    OrderBotService,
  ],
  exports: [BotService, BotAuthService, OrderBotService],
})
export class BotModule {}
