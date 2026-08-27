import { ApiProperty } from '@nestjs/swagger';

export class LogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  areaId: string;

  @ApiProperty()
  areaName: string;

  @ApiProperty()
  entryTime: Date;
}
