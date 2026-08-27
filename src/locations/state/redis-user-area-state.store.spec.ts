import Redis from 'ioredis';
import { LogsService } from '../../logs/logs.service';
import { RedisUserAreaStateStore } from './redis-user-area-state.store';

/** @since 26.08.2026 */
describe('RedisUserAreaStateStore', () => {
  let store: RedisUserAreaStateStore;
  let redis: jest.Mocked<Redis>;
  let logsService: jest.Mocked<LogsService>;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    logsService = {
      findLastAreaIdForUser: jest.fn(),
    } as unknown as jest.Mocked<LogsService>;

    store = new RedisUserAreaStateStore(redis, logsService);
  });

  describe('getCurrentArea', () => {
    it("Redis'te gerçek bir alan id'si varsa onu döner, Postgres'e sormaz", async () => {
      redis.get.mockResolvedValue('area-1');

      const result = await store.getCurrentArea(12345);

      expect(result).toBe('area-1');
      expect(logsService.findLastAreaIdForUser).not.toHaveBeenCalled();
    });

    it("Redis'te \"dışarıda\" sentinel'i (boş string) varsa null döner, Postgres'e sormaz", async () => {
      redis.get.mockResolvedValue('');

      const result = await store.getCurrentArea(12345);

      expect(result).toBeNull();
      expect(logsService.findLastAreaIdForUser).not.toHaveBeenCalled();
    });

    it("Redis miss ve Postgres'te önceki log varsa: o alanı döner ve Redis'i yeniden doldurur", async () => {
      redis.get.mockResolvedValue(null);
      logsService.findLastAreaIdForUser.mockResolvedValue('area-7');

      const result = await store.getCurrentArea(12345);

      expect(result).toBe('area-7');
      expect(redis.set).toHaveBeenCalledWith(
        'user:12345:current_area',
        'area-7',
      );
    });

    it("Redis miss ve Postgres'te hiç log yoksa (ilk ping): null döner, Redis'e yazmaz", async () => {
      redis.get.mockResolvedValue(null);
      logsService.findLastAreaIdForUser.mockResolvedValue(null);

      const result = await store.getCurrentArea(12345);

      expect(result).toBeNull();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('setCurrentArea', () => {
    it("doğru key ile alan id'sini yazar", async () => {
      await store.setCurrentArea(12345, 'area-1');

      expect(redis.set).toHaveBeenCalledWith(
        'user:12345:current_area',
        'area-1',
      );
    });
  });

  describe('clearCurrentArea', () => {
    it('key\'i silmez, "dışarıda" sentinel\'ini yazar (miss ile karışmasın diye)', async () => {
      await store.clearCurrentArea(12345);

      expect(redis.set).toHaveBeenCalledWith('user:12345:current_area', '');
    });
  });
});
