import { Injectable } from '@nestjs/common';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
  poolSize: number;
}

@Injectable()
export class DatabaseConfigService {
  getConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'cakramerp',
      schema: process.env.DB_SCHEMA ?? 'public',
      synchronize: false, // Always false — use migrations instead
      logging: process.env.DB_LOGGING === 'true',
      ssl: process.env.DB_SSL === 'true',
      poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
    };
  }
}
