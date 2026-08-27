import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AreasRepository } from '../areas/areas.repository';
import { Area } from '../areas/entities/area.entity';
import { LocationLog } from './entities/location-log.entity';
import { LogsRepository } from './logs.repository';

/**
 * `findWithFilters`'ın (userId/areaId/tarih aralığı filtreleri + sayfalama) gerçek SQL'ini doğrular.
 *
 * @since 26.08.2026
 */
describe('LogsRepository.findWithFilters (entegrasyon testi)', () => {
  let dataSource: DataSource;
  let logsRepository: LogsRepository;
  let areaAId: string;
  let areaBId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Area, LocationLog],
    });
    await dataSource.initialize();

    const areasRepository = new AreasRepository(dataSource.getRepository(Area));
    const areaA = await areasRepository.create('Alan A', {
      type: 'Polygon',
      coordinates: [
        [
          [28.9, 41.0],
          [28.95, 41.0],
          [28.95, 41.05],
          [28.9, 41.05],
          [28.9, 41.0],
        ],
      ],
    });
    const areaB = await areasRepository.create('Alan B', {
      type: 'Polygon',
      coordinates: [
        [
          [29.1, 41.0],
          [29.15, 41.0],
          [29.15, 41.05],
          [29.1, 41.05],
          [29.1, 41.0],
        ],
      ],
    });
    areaAId = areaA.id;
    areaBId = areaB.id;

    logsRepository = new LogsRepository(dataSource.getRepository(LocationLog));

    // Kontrollü zaman damgaları — from/to filtrelerini anlamlı test edebilmek için.
    await dataSource.query(
      `INSERT INTO location_logs (user_id, area_id, entry_time) VALUES
        (101, $1, '2026-08-01T10:00:00.000Z'),
        (101, $2, '2026-08-05T10:00:00.000Z'),
        (102, $1, '2026-08-10T10:00:00.000Z'),
        (101, $1, '2026-08-15T10:00:00.000Z'),
        (101, $1, '2026-08-20T10:00:00.000Z')`,
      [areaAId, areaBId],
    );
  });

  afterAll(async () => {
    await dataSource.query('TRUNCATE areas CASCADE');
    await dataSource.destroy();
  });

  it('userId ile filtreler', async () => {
    const result = await logsRepository.findWithFilters({ userId: 102 }, 1, 20);

    expect(result.total).toBe(1);
    expect(result.items[0].userId).toBe(102);
  });

  it('areaId ile filtreler', async () => {
    const result = await logsRepository.findWithFilters(
      { areaId: areaBId },
      1,
      20,
    );

    expect(result.total).toBe(1);
    expect(result.items[0].areaId).toBe(areaBId);
  });

  it('tarih aralığı ile filtreler (from/to dahil)', async () => {
    const result = await logsRepository.findWithFilters(
      {
        from: new Date('2026-08-05T00:00:00.000Z'),
        to: new Date('2026-08-15T23:59:59.999Z'),
      },
      1,
      20,
    );

    expect(result.total).toBe(3); // 08-05, 08-10, 08-15
  });

  it('en yeniden en eskiye sıralar ve doğru sayfalar', async () => {
    const page1 = await logsRepository.findWithFilters({ userId: 101 }, 1, 2);
    const page2 = await logsRepository.findWithFilters({ userId: 101 }, 2, 2);

    expect(page1.total).toBe(4);
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0].entryTime.toISOString()).toContain('2026-08-20');
    expect(page1.items[1].entryTime.toISOString()).toContain('2026-08-15');
    expect(page2.items[0].entryTime.toISOString()).toContain('2026-08-05');
    expect(page2.items[1].entryTime.toISOString()).toContain('2026-08-01');
  });
});
