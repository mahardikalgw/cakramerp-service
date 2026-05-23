import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupService } from './application/services/backup.service';
import { AdminBackupController } from './infrastructure/http/controllers/admin-backup.controller';
import { BackupJobTypeOrmRepository } from './infrastructure/repositories/backup-job-typeorm.repository';
import { BackupHistoryTypeOrmRepository } from './infrastructure/repositories/backup-history-typeorm.repository';
import { BackupJobTypeOrmEntity } from './infrastructure/entities/backup-job-typeorm.entity';
import { BackupHistoryTypeOrmEntity } from './infrastructure/entities/backup-history-typeorm.entity';
import { BACKUP_JOB_REPOSITORY } from './domain/repositories/backup-job-repository.port';
import { BACKUP_HISTORY_REPOSITORY } from './domain/repositories/backup-history-repository.port';
import { BACKUP_SERVICE } from './application/ports/backup-service.port';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BackupJobTypeOrmEntity,
      BackupHistoryTypeOrmEntity,
    ]),
    UserModule,
  ],
  controllers: [AdminBackupController],
  providers: [
    {
      provide: BACKUP_SERVICE,
      useClass: BackupService,
    },
    {
      provide: BACKUP_JOB_REPOSITORY,
      useClass: BackupJobTypeOrmRepository,
    },
    {
      provide: BACKUP_HISTORY_REPOSITORY,
      useClass: BackupHistoryTypeOrmRepository,
    },
  ],
  exports: [BACKUP_SERVICE, BACKUP_JOB_REPOSITORY, BACKUP_HISTORY_REPOSITORY],
})
export class BackupModule {}
