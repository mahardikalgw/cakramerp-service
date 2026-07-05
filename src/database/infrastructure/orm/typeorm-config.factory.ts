import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from '../config/database-config.service';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export class TypeOrmConfigFactory {
  static createOptions(config: DatabaseConfig): DataSourceOptions {
    const master = config.master;
    const baseOptions: DataSourceOptions = {
      type: 'postgres',
      schema: config.schema,
      synchronize: config.synchronize,
      logging: config.logging,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      poolSize: config.poolSize,
      namingStrategy: new SnakeNamingStrategy(),
      entities: [
        __dirname +
          '/../../../modules/**/infrastructure/entities/*.entity{.ts,.js}',
        __dirname + '/../../../modules/**/infrastructure/**/*.entity{.ts,.js}',
      ],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: true,
    };

    if (config.replicas.length > 0) {
      const replicas = config.replicas.map((replica) => ({
        type: 'postgres' as const,
        host: replica.host,
        port: replica.port,
        username: replica.username,
        password: replica.password,
        database: replica.database,
      }));

      return {
        ...baseOptions,
        replication: {
          master: {
            host: master.host,
            port: master.port,
            username: master.username,
            password: master.password,
            database: master.database,
          },
          slaves: replicas,
          defaultMode: 'slave' as const,
        },
      };
    }

    return {
      ...baseOptions,
      host: master.host,
      port: master.port,
      username: master.username,
      password: master.password,
      database: master.database,
    };
  }

  static createDataSource(config: DatabaseConfig): DataSource {
    return new DataSource(this.createOptions(config));
  }
}
