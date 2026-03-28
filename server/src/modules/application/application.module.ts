import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { RoleApplication } from './role-application.entity';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { Store } from '../store/entities/store.entity';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleApplication, User, Auth, Store]),
    StoreModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
