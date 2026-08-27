import 'dotenv/config';
import { extname } from 'path';
import { DataSource } from 'typeorm';

/** Migration CLI'ının DataSource'u; ts-node (lokal) ve derlenmiş dist (Docker) ikisinde de çalışsın diye uzantıya bakılıyor. */
const isCompiled = extname(__filename) === '.js';

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [isCompiled ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
  migrations: [
    isCompiled
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts',
  ],
});
