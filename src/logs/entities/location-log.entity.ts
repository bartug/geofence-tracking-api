import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * `location_logs` tablosu; sadece giriş loglanır, çıkış yok — bu yüzden satırlar immutable.
 *
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@Entity('location_logs')
export class LocationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'area_id' })
  areaId: string;

  @CreateDateColumn({ name: 'entry_time' })
  entryTime: Date;
}
