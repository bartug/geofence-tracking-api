import { ApiProperty } from '@nestjs/swagger';
import { GeoJsonPolygonDto } from './geojson-polygon.dto';

export class AreaResponseDto {
  @ApiProperty({ example: 'b3f1c2e4-5a6b-4c7d-8e9f-0a1b2c3d4e5f' })
  id: string;

  @ApiProperty({ example: 'Pendik Merkez' })
  name: string;

  @ApiProperty({ type: GeoJsonPolygonDto })
  polygon: GeoJsonPolygonDto;

  @ApiProperty()
  createdAt: Date;
}
