import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthRedisService } from './auth.redis.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        });

        const logger = new Logger('RedisModule');
        redis.on('error', (error) => {
          logger.error(error.message);
        });

        return redis;
      },
      inject: [ConfigService],
    },
    AuthRedisService,
  ],
  exports: [REDIS_CLIENT, AuthRedisService],
})
export class RedisModule {}
