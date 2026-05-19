import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseConfigService } from './infrastructure/config/database-config.service';
import { TypeOrmConfigFactory } from './infrastructure/orm/typeorm-config.factory';

const configService = new DatabaseConfigService();
const config = configService.getConfig();

export const dataSourceOptions: DataSourceOptions = {
  ...TypeOrmConfigFactory.createOptions(config),
  entities: [__dirname + '/../modules/**/infrastructure/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/infrastructure/migrations/*{.ts,.js}'],
};

export default new DataSource(dataSourceOptions);
