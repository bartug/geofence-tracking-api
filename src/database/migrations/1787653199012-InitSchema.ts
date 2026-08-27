import { MigrationInterface, QueryRunner } from 'typeorm';

/** PostGIS/pgcrypto + areas/location_logs şeması; geography/GiST elle SQL (ORM'un otomatik üretimine güvenilmedi). */
export class InitSchema1787653199012 implements MigrationInterface {
  name = 'InitSchema1787653199012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE areas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        polygon geography(Polygon, 4326) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_areas_polygon_gist ON areas USING GIST (polygon);`,
    );

    await queryRunner.query(`
      CREATE TABLE location_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id integer NOT NULL,
        area_id uuid NOT NULL REFERENCES areas(id),
        entry_time timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX idx_location_logs_user_id ON location_logs (user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_location_logs_area_id ON location_logs (area_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_location_logs_entry_time ON location_logs (entry_time);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_location_logs_user_entry ON location_logs (user_id, entry_time DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS location_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS areas;`);
  }
}
