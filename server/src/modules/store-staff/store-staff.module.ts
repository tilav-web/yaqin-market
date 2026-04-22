import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StoreStaff } from './entities/store-staff.entity';
import { StoreStaffInvitation } from './entities/store-staff-invitation.entity';
import { Store } from '../store/entities/store.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { Notification } from '../notification/notification.entity';
import { Order } from '../order/entities/order.entity';
import { StoreStaffService } from './store-staff.service';
import { StoreStaffController } from './store-staff.controller';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreStaff,
      StoreStaffInvitation,
      Store,
      User,
      Auth,
      Notification,
      Order,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [StoreStaffController],
  providers: [StoreStaffService, NotificationService],
  exports: [StoreStaffService],
})
export class StoreStaffModule {}
