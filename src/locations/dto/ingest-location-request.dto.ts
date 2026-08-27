import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class IngestLocationRequestDto {
  @ApiProperty({
    example: 12345,
    description: "Kullanıcının sayısal ID'si (kullanıcı sisteminden gelen PK)",
  })
  @Min(1)
  @IsInt()
  userId: number;

  @ApiProperty({ example: 41.0082 })
  @Min(-90)
  @Max(90)
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 28.9784 })
  @Min(-180)
  @Max(180)
  @IsNumber()
  longitude: number;
}
