import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../cache/redis.module';
import { LogsService } from '../../logs/logs.service';
import { UserAreaStateStore } from './user-area-state.store';

/** Redis'te alan bulunamadığında (kullanıcı "dışarıda" olarak işaretliyken) kullanılan sentinel. */
const OUTSIDE_SENTINEL = '';

/**
 * Redis hızlı yol, Postgres (LogsService) doğruluk fallback'i. "Dışarıda" durumu
 * `DEL` yerine boş string sentinel'iyle işaretlenir — yoksa "hiç state yok" ile
 * "bilinçli dışarıda" ayrımı kaybolur.
 *
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@Injectable()
export class RedisUserAreaStateStore implements UserAreaStateStore {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logsService: LogsService,
  ) {}

  async getCurrentArea(userId: number): Promise<string | null> {
    const cached = await this.redis.get(this.key(userId));

    if (cached !== null) {
      return cached === OUTSIDE_SENTINEL ? null : cached;
    }

    // Cache miss: Postgres'ten yeniden kur, Redis'i de doldur.
    const lastAreaId = await this.logsService.findLastAreaIdForUser(userId);
    if (lastAreaId) {
      await this.setCurrentArea(userId, lastAreaId);
    }
    return lastAreaId;
  }

  async setCurrentArea(userId: number, areaId: string): Promise<void> {
    await this.redis.set(this.key(userId), areaId);
  }

  async clearCurrentArea(userId: number): Promise<void> {
    await this.redis.set(this.key(userId), OUTSIDE_SENTINEL);
  }

  private key(userId: number): string {
    return `user:${userId}:current_area`;
  }
}
