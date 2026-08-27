import { LogsService } from '../logs/logs.service';
import {
  ContainingArea,
  GeofenceContainmentStrategy,
} from './containment/geofence-containment.strategy';
import { IngestLocationRequestDto } from './dto/ingest-location-request.dto';
import { LocationsService } from './locations.service';
import { UserAreaStateStore } from './state/user-area-state.store';

/** @since 26.08.2026 */
describe('LocationsService', () => {
  let service: LocationsService;
  let containmentStrategy: jest.Mocked<GeofenceContainmentStrategy>;
  let stateStore: jest.Mocked<UserAreaStateStore>;
  let logsService: jest.Mocked<LogsService>;

  const areaA: ContainingArea = { id: 'area-a', name: 'Alan A' };
  const areaB: ContainingArea = { id: 'area-b', name: 'Alan B' };

  const baseDto: IngestLocationRequestDto = {
    userId: 12345,
    latitude: 41.01,
    longitude: 28.98,
  };

  beforeEach(() => {
    containmentStrategy = { findContainingArea: jest.fn() };
    stateStore = {
      getCurrentArea: jest.fn(),
      setCurrentArea: jest.fn(),
      clearCurrentArea: jest.fn(),
    };
    logsService = {
      logEntry: jest.fn(),
      findLastAreaIdForUser: jest.fn(),
    } as unknown as jest.Mocked<LogsService>;

    service = new LocationsService(
      containmentStrategy,
      stateStore,
      logsService,
    );
  });

  it("kullanıcının ilk ping'i bir alanın içindeyse: loglar, state'i kaydeder, entered=true döner", async () => {
    containmentStrategy.findContainingArea.mockResolvedValue(areaA);
    stateStore.getCurrentArea.mockResolvedValue(null);

    const result = await service.ingest(baseDto);

    expect(logsService.logEntry).toHaveBeenCalledWith(12345, 'area-a');
    expect(stateStore.setCurrentArea).toHaveBeenCalledWith(12345, 'area-a');
    expect(result).toEqual({ entered: true, area: areaA });
  });

  it("aynı alanda tekrar ping: loglamaz, state'e yazmaz, entered=false döner", async () => {
    containmentStrategy.findContainingArea.mockResolvedValue(areaA);
    stateStore.getCurrentArea.mockResolvedValue('area-a');

    const result = await service.ingest(baseDto);

    expect(logsService.logEntry).not.toHaveBeenCalled();
    expect(stateStore.setCurrentArea).not.toHaveBeenCalled();
    expect(stateStore.clearCurrentArea).not.toHaveBeenCalled();
    expect(result).toEqual({ entered: false, area: null });
  });

  it("alan A'dan alan B'ye geçiş: B'ye giriş loglanır, state B olarak güncellenir", async () => {
    containmentStrategy.findContainingArea.mockResolvedValue(areaB);
    stateStore.getCurrentArea.mockResolvedValue('area-a');

    const result = await service.ingest(baseDto);

    expect(logsService.logEntry).toHaveBeenCalledWith(12345, 'area-b');
    expect(stateStore.setCurrentArea).toHaveBeenCalledWith(12345, 'area-b');
    expect(result).toEqual({ entered: true, area: areaB });
  });

  it('bir alandan tamamen çıkış: loglanmaz, state temizlenir, entered=false döner', async () => {
    containmentStrategy.findContainingArea.mockResolvedValue(null);
    stateStore.getCurrentArea.mockResolvedValue('area-a');

    const result = await service.ingest(baseDto);

    expect(logsService.logEntry).not.toHaveBeenCalled();
    expect(stateStore.clearCurrentArea).toHaveBeenCalledWith(12345);
    expect(result).toEqual({ entered: false, area: null });
  });

  it('alan dışında iken tekrar alan dışı ping: hiçbir şey yapmaz (no-op)', async () => {
    containmentStrategy.findContainingArea.mockResolvedValue(null);
    stateStore.getCurrentArea.mockResolvedValue(null);

    const result = await service.ingest(baseDto);

    expect(logsService.logEntry).not.toHaveBeenCalled();
    expect(stateStore.setCurrentArea).not.toHaveBeenCalled();
    expect(stateStore.clearCurrentArea).not.toHaveBeenCalled();
    expect(result).toEqual({ entered: false, area: null });
  });
});
