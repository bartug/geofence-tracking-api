import { Injectable } from '@nestjs/common';
import { AreasService } from '../areas/areas.service';
import {
  PaginationMeta,
  buildPaginationMeta,
} from '../common/pagination/pagination-meta.interface';
import { LogFilters, LogsRepository } from './logs.repository';
import { LogResponseDto } from './dto/log-response.dto';

export interface LogListResult {
  items: LogResponseDto[];
  meta: PaginationMeta;
}

/**
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@Injectable()
export class LogsService {
  constructor(
    private readonly logsRepository: LogsRepository,
    private readonly areasService: AreasService,
  ) {}

  async logEntry(userId: number, areaId: string): Promise<void> {
    await this.logsRepository.create(userId, areaId);
  }

  /** RedisUserAreaStateStore'un cache miss'te başvurduğu fallback. */
  async findLastAreaIdForUser(userId: number): Promise<string | null> {
    const last = await this.logsRepository.findLastByUser(userId);
    return last?.areaId ?? null;
  }

  /** `areaName` için `AreasService.findAll()`'a gider — o zaten cache'li, ekstra DB sorgusu değil. */
  async findAll(
    filters: LogFilters,
    page: number,
    limit: number,
  ): Promise<LogListResult> {
    const [{ items, total }, areas] = await Promise.all([
      this.logsRepository.findWithFilters(filters, page, limit),
      this.areasService.findAll(),
    ]);

    const areaNameById = new Map(areas.map((area) => [area.id, area.name]));

    return {
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        areaId: item.areaId,
        areaName: areaNameById.get(item.areaId) ?? 'Bilinmeyen alan',
        entryTime: item.entryTime,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
