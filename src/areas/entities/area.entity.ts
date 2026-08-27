import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { GeoJsonPolygon } from '../geojson-polygon.type';

/**
 * `areas` tablosu. Şema manuel SQL ile kuruldu
 *
 * @author Bartuğ Sevindik
 * @since 27.08.2026
 */
@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  polygon: GeoJsonPolygon;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
