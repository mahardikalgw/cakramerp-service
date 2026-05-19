import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfigService } from './infrastructure/config/database-config.service';
import { TypeOrmConfigFactory } from './infrastructure/orm/typeorm-config.factory';
import { DatabaseHealthService } from './application/services/database-health.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const configService = new DatabaseConfigService();
        const config = configService.getConfig();
        return TypeOrmConfigFactory.createOptions(config);
      },
    }),
  ],
  providers: [DatabaseConfigService, DatabaseHealthService],
  exports: [DatabaseConfigService, DatabaseHealthService],
})
export class DatabaseModule {}
