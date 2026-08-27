import { Injectable } from '@nestjs/common';
import { AreasService } from '../../areas/areas.service';
import {
  ContainingArea,
  GeofenceContainmentStrategy,
  GeofencePoint,
} from './geofence-containment.strategy';

/**
 * `AreasService.findContaining`'e delege eder; PostGIS detayları `areas` modülünde kalır.
 *
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@Injectable()
export class PostgisContainmentStrategy implements GeofenceContainmentStrategy {
  constructor(private readonly areasService: AreasService) {}

  async findContainingArea(
    point: GeofencePoint,
  ): Promise<ContainingArea | null> {
    const area = await this.areasService.findContaining(point.lat, point.lng);
    return area ? { id: area.id, name: area.name } : null;
  }
}
