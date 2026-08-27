import { ApiProperty } from '@nestjs/swagger';
import { LogResponseDto } from './log-response.dto';

class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class LogListResponseDto {
  @ApiProperty({ type: [LogResponseDto] })
  items: LogResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
