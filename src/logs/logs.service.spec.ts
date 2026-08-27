import { AreasService } from '../areas/areas.service';
import { AreaResponseDto } from '../areas/dto/area-response.dto';
import { LocationLog } from './entities/location-log.entity';
import { LogsRepository } from './logs.repository';
import { LogsService } from './logs.service';

/** @since 26.08.2026 */
describe('LogsService', () => {
  let service: LogsService;
  let repository: jest.Mocked<LogsRepository>;
  let areasService: jest.Mocked<AreasService>;

  const area: AreaResponseDto = {
    id: 'area-1',
    name: 'Kadıköy Merkez',
    polygon: { type: 'Polygon', coordinates: [] },
    createdAt: new Date(),
  };

  const log: LocationLog = {
    id: 'log-1',
    userId: 12345,
    areaId: 'area-1',
    entryTime: new Date('2026-08-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findLastByUser: jest.fn(),
      findWithFilters: jest.fn(),
    } as unknown as jest.Mocked<LogsRepository>;

    areasService = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<AreasService>;

    service = new LogsService(repository, areasService);
  });

  it('log kayıtlarını areaName ile zenginleştirir (AreasService.findAll üzerinden)', async () => {
    repository.findWithFilters.mockResolvedValue({ items: [log], total: 1 });
    areasService.findAll.mockResolvedValue([area]);

    const result = await service.findAll({}, 1, 20);

    expect(result.items).toEqual([
      {
        id: 'log-1',
        userId: 12345,
        areaId: 'area-1',
        areaName: 'Kadıköy Merkez',
        entryTime: log.entryTime,
      },
    ]);
  });

  it('alan artık silinmiş/bulunamıyorsa "Bilinmeyen alan" yazar, hata fırlatmaz', async () => {
    repository.findWithFilters.mockResolvedValue({ items: [log], total: 1 });
    areasService.findAll.mockResolvedValue([]);

    const result = await service.findAll({}, 1, 20);

    expect(result.items[0].areaName).toBe('Bilinmeyen alan');
  });

  it("pagination meta'yı toplam kayıt sayısından doğru hesaplar", async () => {
    repository.findWithFilters.mockResolvedValue({ items: [], total: 45 });
    areasService.findAll.mockResolvedValue([]);

    const result = await service.findAll({}, 2, 20);

    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it("filtreleri olduğu gibi repository'ye iletir", async () => {
    repository.findWithFilters.mockResolvedValue({ items: [], total: 0 });
    areasService.findAll.mockResolvedValue([]);
    const from = new Date('2026-08-01T00:00:00.000Z');
    const to = new Date('2026-08-31T23:59:59.999Z');

    await service.findAll({ userId: 12345, areaId: 'area-1', from, to }, 1, 10);

    expect(repository.findWithFilters).toHaveBeenCalledWith(
      { userId: 12345, areaId: 'area-1', from, to },
      1,
      10,
    );
  });
});
