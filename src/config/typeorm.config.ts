import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Area } from '../areas/entities/area.entity';
import { LocationLog } from '../logs/entities/location-log.entity';

/** Nest DI'daki DataSource ayarları; migration'lar ayrı (bkz. database/data-source.ts), şema hep elle migration'la değişir. */
export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [Area, LocationLog],
  synchronize: false,
  migrationsRun: false,
});
