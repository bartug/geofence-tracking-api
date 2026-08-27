import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { GeoJsonPolygon } from '../geojson-polygon.type';
import { IsClosedPolygonRing } from './is-closed-polygon-ring.validator';

/** GeoJSON koordinat sırası [lng, lat]'tir, [lat, lng] değil . */
export class GeoJsonPolygonDto implements GeoJsonPolygon {
  @ApiProperty({ enum: ['Polygon'], example: 'Polygon' })
  @IsIn(['Polygon'])
  type: 'Polygon';

  @ApiProperty({
    description:
      'Kapalı halka(lar); her nokta [lng, lat]. İlk ve son nokta aynı olmalı.',
    example: [
      [
        [28.9784, 41.0082],
        [28.9884, 41.0082],
        [28.9884, 41.0182],
        [28.9784, 41.0182],
        [28.9784, 41.0082],
      ],
    ],
  })
  @IsClosedPolygonRing()
  coordinates: number[][][];
}
