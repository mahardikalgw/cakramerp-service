import { Injectable } from '@nestjs/common';

export interface DatabaseConfig {
  master: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  replicas: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  }>;
  schema: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
  poolSize: number;
}

@Injectable()
export class DatabaseConfigService {
  getConfig(): DatabaseConfig {
    const base = {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'cakramerp',
    };

    const replicaHosts = process.env.DB_REPLICA_HOSTS
      ? process.env.DB_REPLICA_HOSTS.split(',')
      : [];

    const replicas =
      replicaHosts.length > 0
        ? replicaHosts.map((host) => ({
            host: host.trim(),
            port: parseInt(process.env.DB_REPLICA_PORT ?? '5432', 10),
            username: process.env.DB_REPLICA_USERNAME ?? base.username,
            password: process.env.DB_REPLICA_PASSWORD ?? base.password,
            database: process.env.DB_REPLICA_NAME ?? base.database,
          }))
        : [];

    return {
      master: base,
      replicas,
      schema: process.env.DB_SCHEMA ?? 'public',
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      ssl: process.env.DB_SSL === 'true',
      poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
    };
  }
}
