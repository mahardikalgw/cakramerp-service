import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { BackupHistory } from '../entities/backup-history.entity';

export const BACKUP_HISTORY_REPOSITORY = Symbol('BACKUP_HISTORY_REPOSITORY');

export interface BackupHistoryRepositoryPort extends RepositoryPort<BackupHistory> {
  findByBackupJobId(backupJobId: string): Promise<BackupHistory[]>;
}
