import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AreasRepository } from './areas.repository';
import { Area } from './entities/area.entity';
import { GeoJsonPolygon } from './geojson-polygon.type';

/**
 * `findContaining`'in PostGIS'e giden gerçek SQL'ini doğrular; gerçek Postgres gerektirir.
 *
 * @since 26.08.2026
 */
describe('AreasRepository.findContaining (PostGIS entegrasyon testi)', () => {
  let dataSource: DataSource;
  let repository: AreasRepository;

  const bigSquare: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [28.9, 41.0],
        [29.05, 41.0],
        [29.05, 41.05],
        [28.9, 41.05],
        [28.9, 41.0],
      ],
    ],
  };

  const smallSquareInsideBig: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [28.97, 41.01],
        [28.98, 41.01],
        [28.98, 41.02],
        [28.97, 41.02],
        [28.97, 41.01],
      ],
    ],
  };

  const farAwaySquare: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [10.0, 10.0],
        [10.1, 10.0],
        [10.1, 10.1],
        [10.0, 10.1],
        [10.0, 10.0],
      ],
    ],
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Area],
    });
    await dataSource.initialize();

    repository = new AreasRepository(dataSource.getRepository(Area));

    await repository.create('Büyük Alan', bigSquare);
    await repository.create('Küçük İç Alan', smallSquareInsideBig);
    await repository.create('Uzak Alan', farAwaySquare);
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE areas CASCADE');
    await dataSource.destroy();
  });

  it('nokta tek bir alanın içindeyse o alanı döner', async () => {
    const result = await repository.findContaining(41.005, 28.95);

    expect(result?.name).toBe('Büyük Alan');
  });

  it('nokta hiçbir alanın içinde değilse null döner', async () => {
    const result = await repository.findContaining(0, 0);

    expect(result).toBeNull();
  });

  it('nokta bir alanın sınırının tam üzerindeyse null döner (ST_Contains sınırı içeri saymaz)', async () => {
    const result = await repository.findContaining(41.025, 28.9);

    expect(result).toBeNull();
  });

  it('nokta iç içe geçen iki alanın içindeyse en küçük alanı döner (tie-break)', async () => {
    const result = await repository.findContaining(41.015, 28.975);

    expect(result?.name).toBe('Küçük İç Alan');
  });
});
