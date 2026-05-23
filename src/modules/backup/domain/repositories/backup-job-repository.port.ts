import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { BackupJob } from '../entities/backup-job.entity';

export const BACKUP_JOB_REPOSITORY = Symbol('BACKUP_JOB_REPOSITORY');

export interface BackupJobRepositoryPort extends RepositoryPort<BackupJob> {
  findByStatus(status: string): Promise<BackupJob[]>;
}
