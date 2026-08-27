import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Tek Redis bağlantısını `@Global()` ile tüm modüllere açar.
 *
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Redis(redisConfig(configService)),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
