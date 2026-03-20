import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class AuthRedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * OTP kodini keshga saqlash (2 daqiqa TTL bilan)
   */
  async saveOtp(phone: string, ip: string, code: string): Promise<void> {
    const key = `otp:${phone}:${ip}`;
    await this.redis.set(key, code, 'EX', 120);
  }

  /**
   * Keshdan OTP kodini olish
   */
  async getOtp(phone: string, ip: string): Promise<string | null> {
    const key = `otp:${phone}:${ip}`;
    return this.redis.get(key);
  }

  /**
   * Ishlatib bo'lingach OTP-ni o'chirish
   */
  async deleteOtp(phone: string, ip: string): Promise<void> {
    const key = `otp:${phone}:${ip}`;
    await this.redis.del(key);
  }
}
