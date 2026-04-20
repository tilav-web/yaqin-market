import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { RoleApplication } from './role-application.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { Store } from '../store/entities/store.entity';
import { StoreModule } from '../store/store.module';
import { WalletModule } from '../wallet/wallet.module';
import { SellerLegal } from './seller-legal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleApplication, SellerLegal, User, Auth, Store]),
    StoreModule,
    WalletModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
