import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RateLimitRedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async consume(key: string, limit: number, windowSeconds: number) {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.ttl(key);
    const replies = await multi.exec();
    const current = this.getNumericReplyValue(replies?.[0]);
    let ttl = this.getNumericReplyValue(replies?.[1], -1);

    if (current === 1 || ttl < 0) {
      await this.redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    return {
      allowed: current <= limit,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetInSeconds: ttl,
    };
  }

  private getNumericReplyValue(
    reply: [Error | null, unknown] | null | undefined,
    fallback: number = 0,
  ) {
    const value = reply?.[1];
    return typeof value === 'number' ? value : fallback;
  }
}
