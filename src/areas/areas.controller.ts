import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AreasService } from './areas.service';
import { AreaResponseDto } from './dto/area-response.dto';
import { CreateAreaRequestDto } from './dto/create-area-request.dto';

/**
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@ApiTags('areas')
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni bir coğrafi alan (geofence) tanımlar' })
  @ApiResponse({
    status: 201,
    description: 'Alan oluşturuldu',
    type: AreaResponseDto,
  })
  create(@Body() dto: CreateAreaRequestDto): Promise<AreaResponseDto> {
    return this.areasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Tanımlı tüm alanları listeler' })
  @ApiResponse({
    status: 200,
    description: 'Alan listesi',
    type: [AreaResponseDto],
  })
  findAll(): Promise<AreaResponseDto[]> {
    return this.areasService.findAll();
  }
}
