import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { RolesGuard } from '../auth/guard/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        namespace: 'yaqin-market',
        ttl: Number(configService.get('CATEGORY_CACHE_TTL_MS', 60000)),
        refreshThreshold: Number(
          configService.get('CATEGORY_CACHE_REFRESH_THRESHOLD_MS', 15000),
        ),
        nonBlocking: true,
      }),
    }),
  ],
  controllers: [CategoryController],
  providers: [CategoryService, RolesGuard],
})
export class CategoryModule {}
