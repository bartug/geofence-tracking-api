import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IngestLocationRequestDto } from './dto/ingest-location-request.dto';
import { IngestLocationResponseDto } from './dto/ingest-location-response.dto';
import { LocationsService } from './locations.service';

/**
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Kullanıcı konumunu bildirir; tanımlı bir alana yeni giriş varsa loglar',
  })
  @ApiResponse({
    status: 201,
    description: 'Konum işlendi',
    type: IngestLocationResponseDto,
  })
  create(
    @Body() dto: IngestLocationRequestDto,
  ): Promise<IngestLocationResponseDto> {
    return this.locationsService.ingest(dto);
  }
}
