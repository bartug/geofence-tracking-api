import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { AreaRecord } from '../areas/areas.repository';
import { REDIS_CLIENT } from './redis.module';

const AREAS_CACHE_KEY = 'areas:all';

/**
 * TTL'siz cache-aside; alanlar nadiren değişir, tek mutasyon `POST /areas` invalidate eder.
 *
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@Injectable()
export class AreasCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(): Promise<AreaRecord[] | null> {
    const cached = await this.redis.get(AREAS_CACHE_KEY);
    return cached ? (JSON.parse(cached) as AreaRecord[]) : null;
  }

  async set(areas: AreaRecord[]): Promise<void> {
    await this.redis.set(AREAS_CACHE_KEY, JSON.stringify(areas));
  }

  async invalidate(): Promise<void> {
    await this.redis.del(AREAS_CACHE_KEY);
  }
}
