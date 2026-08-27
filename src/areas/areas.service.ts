import { Injectable } from '@nestjs/common';
import { AreasCacheService } from '../cache/areas-cache.service';
import { AreaRecord, AreasRepository } from './areas.repository';
import { AreaResponseDto } from './dto/area-response.dto';
import { CreateAreaRequestDto } from './dto/create-area-request.dto';

/**
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@Injectable()
export class AreasService {
  constructor(
    private readonly areasRepository: AreasRepository,
    private readonly areasCache: AreasCacheService,
  ) {}

  /** Yazdıktan sonra alan listesi cache'ini invalidate eder. */
  async create(dto: CreateAreaRequestDto): Promise<AreaResponseDto> {
    const record = await this.areasRepository.create(dto.name, dto.polygon);
    await this.areasCache.invalidate();
    return this.toResponseDto(record);
  }

  /** Cache-aside: önce Redis, boşsa DB'den çekip cache'i doldurur. */
  async findAll(): Promise<AreaResponseDto[]> {
    const cached = await this.areasCache.get();
    if (cached) {
      return cached.map((record) => this.toResponseDto(record));
    }

    const records = await this.areasRepository.findAll();
    await this.areasCache.set(records);
    return records.map((record) => this.toResponseDto(record));
  }

  /** Cache'e değil doğrudan PostGIS'e gider — containment doğruluk gerektirir. */
  async findContaining(
    lat: number,
    lng: number,
  ): Promise<AreaResponseDto | null> {
    const record = await this.areasRepository.findContaining(lat, lng);
    return record ? this.toResponseDto(record) : null;
  }

  private toResponseDto(record: AreaRecord): AreaResponseDto {
    return {
      id: record.id,
      name: record.name,
      polygon: record.polygon,
      createdAt: record.createdAt,
    };
  }
}
