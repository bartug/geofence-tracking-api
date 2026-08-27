import { AreasService } from '../../areas/areas.service';
import { AreaResponseDto } from '../../areas/dto/area-response.dto';
import { PostgisContainmentStrategy } from './postgis-containment.strategy';

/** @since 26.08.2026 */
describe('PostgisContainmentStrategy', () => {
  let strategy: PostgisContainmentStrategy;
  let areasService: jest.Mocked<AreasService>;

  beforeEach(() => {
    areasService = {
      findContaining: jest.fn(),
    } as unknown as jest.Mocked<AreasService>;

    strategy = new PostgisContainmentStrategy(areasService);
  });

  it('AreasService bir alan döndürdüğünde id/name çiftine indirger', async () => {
    const area: AreaResponseDto = {
      id: 'area-1',
      name: 'Kadıköy Merkez',
      polygon: { type: 'Polygon', coordinates: [] },
      createdAt: new Date(),
    };
    areasService.findContaining.mockResolvedValue(area);

    const result = await strategy.findContainingArea({
      lat: 41.01,
      lng: 28.98,
    });

    expect(areasService.findContaining).toHaveBeenCalledWith(41.01, 28.98);
    expect(result).toEqual({ id: 'area-1', name: 'Kadıköy Merkez' });
  });

  it('AreasService null döndürdüğünde null döner', async () => {
    areasService.findContaining.mockResolvedValue(null);

    const result = await strategy.findContainingArea({ lat: 0, lng: 0 });

    expect(result).toBeNull();
  });
});
