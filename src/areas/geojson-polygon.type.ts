/** GeoJSON Polygon; coordinates sırası [lng, lat]'tir. */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}
