import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { GeoJsonPolygonDto } from './geojson-polygon.dto';

export class CreateAreaRequestDto {
  @ApiProperty({ example: 'Pendik Merkez' })
  @MaxLength(120)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: GeoJsonPolygonDto })
  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  polygon: GeoJsonPolygonDto;
}
