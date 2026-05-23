import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './application/services/settings.service';
import { AdminSettingsController } from './infrastructure/http/controllers/admin-settings.controller';
import { SettingsTypeOrmRepository } from './infrastructure/repositories/settings-typeorm.repository';
import { SettingsTypeOrmEntity } from './infrastructure/entities/settings-typeorm.entity';
import { SETTINGS_REPOSITORY } from './domain/repositories/settings-repository.port';
import { SETTINGS_SERVICE } from './application/ports/settings-service.port';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([SettingsTypeOrmEntity]), UserModule],
  controllers: [AdminSettingsController],
  providers: [
    {
      provide: SETTINGS_SERVICE,
      useClass: SettingsService,
    },
    {
      provide: SETTINGS_REPOSITORY,
      useClass: SettingsTypeOrmRepository,
    },
  ],
  exports: [SETTINGS_SERVICE, SETTINGS_REPOSITORY],
})
export class SettingsModule {}
