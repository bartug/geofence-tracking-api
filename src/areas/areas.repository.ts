import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { GeoJsonPolygon } from './geojson-polygon.type';

export interface AreaRecord {
  id: string;
  name: string;
  polygon: GeoJsonPolygon;
  createdAt: Date;
}

interface AreaRawRow {
  id: string;
  name: string;
  polygon: string;
  createdAt: Date;
}

/**
 * `geography` kolonu entity hydration'la düzgün GeoJSON'a dönmüyor, bu yüzden
 * `ST_AsGeoJSON`/`ST_GeomFromGeoJSON` ile parametreli sorgular kullanılıyor.
 *
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@Injectable()
export class AreasRepository {
  constructor(
    @InjectRepository(Area) private readonly repository: Repository<Area>,
  ) {}

  async create(name: string, polygon: GeoJsonPolygon): Promise<AreaRecord> {
    const insertResult = await this.repository
      .createQueryBuilder()
      .insert()
      .into(Area)
      .values({
        name,
        polygon: () => 'ST_GeomFromGeoJSON(:polygonGeoJson)',
      })
      .setParameter('polygonGeoJson', JSON.stringify(polygon))
      .returning('id')
      .execute();

    const insertedRow = insertResult.raw as Array<{ id: string }>;
    return this.findById(insertedRow[0].id);
  }

  async findById(id: string): Promise<AreaRecord> {
    const row = await this.repository
      .createQueryBuilder('area')
      .select('area.id', 'id')
      .addSelect('area.name', 'name')
      .addSelect('ST_AsGeoJSON(area.polygon)', 'polygon')
      .addSelect('area.created_at', 'createdAt')
      .where('area.id = :id', { id })
      .getRawOne<AreaRawRow>();

    if (!row) {
      throw new Error(`Area bulunamadı: ${id}`);
    }

    return this.toRecord(row);
  }

  async findAll(): Promise<AreaRecord[]> {
    const rows = await this.repository
      .createQueryBuilder('area')
      .select('area.id', 'id')
      .addSelect('area.name', 'name')
      .addSelect('ST_AsGeoJSON(area.polygon)', 'polygon')
      .addSelect('area.created_at', 'createdAt')
      .orderBy('area.created_at', 'ASC')
      .getRawMany<AreaRawRow>();

    return rows.map((row) => this.toRecord(row));
  }

  /** ST_Contains sınırı içeri saymaz (bilinçli). Birden fazla alan eşleşirse en küçüğü (ST_Area) döner. */
  async findContaining(lat: number, lng: number): Promise<AreaRecord | null> {
    const row = await this.repository
      .createQueryBuilder('area')
      .select('area.id', 'id')
      .addSelect('area.name', 'name')
      .addSelect('ST_AsGeoJSON(area.polygon)', 'polygon')
      .addSelect('area.created_at', 'createdAt')
      .where(
        'ST_Contains(area.polygon::geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))',
        {
          lng,
          lat,
        },
      )
      .orderBy('ST_Area(area.polygon::geometry)', 'ASC')
      .limit(1)
      .getRawOne<AreaRawRow>();

    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: AreaRawRow): AreaRecord {
    return {
      id: row.id,
      name: row.name,
      polygon: JSON.parse(row.polygon) as GeoJsonPolygon,
      createdAt: row.createdAt,
    };
  }
}
