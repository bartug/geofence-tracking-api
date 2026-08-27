import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { LocationLog } from './entities/location-log.entity';

export interface LogFilters {
  userId?: number;
  areaId?: string;
  from?: Date;
  to?: Date;
}

export interface LogPage {
  items: LocationLog[];
  total: number;
}

/**
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@Injectable()
export class LogsRepository {
  constructor(
    @InjectRepository(LocationLog)
    private readonly repository: Repository<LocationLog>,
  ) {}

  async create(userId: number, areaId: string): Promise<void> {
    await this.repository.insert({ userId, areaId });
  }

  /** Redis debounce state'i kaybolduğunda (restart/flush) fallback için kullanılır. */
  async findLastByUser(userId: number): Promise<LocationLog | null> {
    return this.repository.findOne({
      where: { userId },
      order: { entryTime: 'DESC' },
    });
  }

  /** `areaName` yok — `LogsService`, `AreasService.findAll()` (cache'li) üzerinden id→name eşliyor. */
  async findWithFilters(
    filters: LogFilters,
    page: number,
    limit: number,
  ): Promise<LogPage> {
    const dataQuery = this.repository
      .createQueryBuilder('log')
      .orderBy('log.entryTime', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);
    this.applyFilters(dataQuery, filters);

    const countQuery = this.repository.createQueryBuilder('log');
    this.applyFilters(countQuery, filters);

    const [items, total] = await Promise.all([
      dataQuery.getMany(),
      countQuery.getCount(),
    ]);

    return { items, total };
  }

  private applyFilters(
    query: SelectQueryBuilder<LocationLog>,
    filters: LogFilters,
  ): void {
    if (filters.userId) {
      query.andWhere('log.userId = :userId', { userId: filters.userId });
    }
    if (filters.areaId) {
      query.andWhere('log.areaId = :areaId', { areaId: filters.areaId });
    }
    if (filters.from) {
      query.andWhere('log.entryTime >= :from', { from: filters.from });
    }
    if (filters.to) {
      query.andWhere('log.entryTime <= :to', { to: filters.to });
    }
  }
}
