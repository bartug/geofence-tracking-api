import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 12345 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ example: 'b3f1c2e4-5a6b-4c7d-8e9f-0a1b2c3d4e5f' })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601, alt sınır (dahil)',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601, üst sınır (dahil)',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
