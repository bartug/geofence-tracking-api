import { Inject, Injectable } from '@nestjs/common';
import { LogsService } from '../logs/logs.service';
import { GEOFENCE_CONTAINMENT_STRATEGY } from './containment/geofence-containment.strategy';
import type { GeofenceContainmentStrategy } from './containment/geofence-containment.strategy';
import { IngestLocationRequestDto } from './dto/ingest-location-request.dto';
import { IngestLocationResponseDto } from './dto/ingest-location-response.dto';
import { USER_AREA_STATE_STORE } from './state/user-area-state.store';
import type { UserAreaStateStore } from './state/user-area-state.store';

/**
 * Debounce: sadece YENİ bir alana giriş loglanır. Bilinen sınır: eşzamanlı
 * isteklerde `getCurrentArea`+`setCurrentArea` arası küçük bir yarış var,
 * bilinçli çözülmedi (bkz. README "Bilinen sınırlar").
 *
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@Injectable()
export class LocationsService {
  constructor(
    @Inject(GEOFENCE_CONTAINMENT_STRATEGY)
    private readonly containmentStrategy: GeofenceContainmentStrategy,
    @Inject(USER_AREA_STATE_STORE)
    private readonly stateStore: UserAreaStateStore,
    private readonly logsService: LogsService,
  ) {}

  async ingest(
    dto: IngestLocationRequestDto,
  ): Promise<IngestLocationResponseDto> {
    const containingArea = await this.containmentStrategy.findContainingArea({
      lat: dto.latitude,
      lng: dto.longitude,
    });
    const newAreaId = containingArea?.id ?? null;
    const previousAreaId = await this.stateStore.getCurrentArea(dto.userId);

    if (newAreaId === previousAreaId) {
      return { entered: false, area: null };
    }

    if (newAreaId === null) {
      await this.stateStore.clearCurrentArea(dto.userId);
      return { entered: false, area: null };
    }

    await this.logsService.logEntry(dto.userId, newAreaId);
    await this.stateStore.setCurrentArea(dto.userId, newAreaId);
    return { entered: true, area: containingArea };
  }
}
