export interface GeofencePoint {
  lat: number;
  lng: number;
}

export interface ContainingArea {
  id: string;
  name: string;
}

/** "Bu nokta hangi alanda?" sorusunu soyutlar; tek implementasyon PostGIS'e gidiyor. */
export const GEOFENCE_CONTAINMENT_STRATEGY = 'GEOFENCE_CONTAINMENT_STRATEGY';

export interface GeofenceContainmentStrategy {
  findContainingArea(point: GeofencePoint): Promise<ContainingArea | null>;
}
