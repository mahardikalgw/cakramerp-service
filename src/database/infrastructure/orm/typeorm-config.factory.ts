import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from '../config/database-config.service';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export class TypeOrmConfigFactory {
  static createOptions(config: DatabaseConfig): DataSourceOptions {
    return {
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      schema: config.schema,
      synchronize: config.synchronize,
      logging: config.logging,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      poolSize: config.poolSize,
      namingStrategy: new SnakeNamingStrategy(),
      entities: [
        __dirname +
          '/../../../modules/**/infrastructure/entities/*.entity{.ts,.js}',
      ],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: false,
    };
  }

  static createDataSource(config: DatabaseConfig): DataSource {
    return new DataSource(this.createOptions(config));
  }
}
