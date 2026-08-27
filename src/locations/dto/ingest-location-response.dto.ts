import { ApiProperty } from '@nestjs/swagger';

export class IngestedAreaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class IngestLocationResponseDto {
  @ApiProperty({
    description:
      'Bu istek sonucunda YENİ bir alana giriş loglandıysa true; aynı alanda tekrar ping veya alan dışıysa false.',
  })
  entered: boolean;

  @ApiProperty({ type: IngestedAreaDto, nullable: true })
  area: IngestedAreaDto | null;
}
