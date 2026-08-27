import { AreasCacheService } from '../cache/areas-cache.service';
import { AreaRecord, AreasRepository } from './areas.repository';
import { AreasService } from './areas.service';
import { CreateAreaRequestDto } from './dto/create-area-request.dto';

/** @since 26.08.2026 */
describe('AreasService', () => {
  let service: AreasService;
  let repository: jest.Mocked<AreasRepository>;
  let cache: jest.Mocked<AreasCacheService>;

  const record: AreaRecord = {
    id: 'area-1',
    name: 'Kadıköy Merkez',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [28.9784, 41.0082],
          [28.9884, 41.0082],
          [28.9884, 41.0182],
          [28.9784, 41.0082],
        ],
      ],
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findContaining: jest.fn(),
    } as unknown as jest.Mocked<AreasRepository>;

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<AreasCacheService>;

    service = new AreasService(repository, cache);
  });

  describe('findAll', () => {
    it('cache doluysa DB sorgusu atmadan cache verisini döner', async () => {
      cache.get.mockResolvedValue([record]);

      const result = await service.findAll();

      expect(result).toEqual([
        {
          id: record.id,
          name: record.name,
          polygon: record.polygon,
          createdAt: record.createdAt,
        },
      ]);
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it("cache boşsa DB'den çeker ve cache'i doldurur", async () => {
      cache.get.mockResolvedValue(null);
      repository.findAll.mockResolvedValue([record]);

      const result = await service.findAll();

      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith([record]);
      expect(result[0].id).toBe(record.id);
    });
  });

  describe('create', () => {
    it("yeni alan oluşturduktan sonra cache'i geçersiz kılar", async () => {
      repository.create.mockResolvedValue(record);
      const dto: CreateAreaRequestDto = {
        name: record.name,
        polygon: record.polygon,
      };

      await service.create(dto);

      expect(cache.invalidate).toHaveBeenCalledTimes(1);
    });
  });

  describe('findContaining', () => {
    it("cache'e bakmadan repository sonucunu DTO'ya çevirip döner", async () => {
      repository.findContaining.mockResolvedValue(record);

      const result = await service.findContaining(41.01, 28.98);

      expect(repository.findContaining).toHaveBeenCalledWith(41.01, 28.98);
      expect(cache.get).not.toHaveBeenCalled();
      expect(result?.id).toBe(record.id);
    });

    it('hiçbir alan noktayı içermiyorsa null döner', async () => {
      repository.findContaining.mockResolvedValue(null);

      const result = await service.findContaining(0, 0);

      expect(result).toBeNull();
    });
  });
});
