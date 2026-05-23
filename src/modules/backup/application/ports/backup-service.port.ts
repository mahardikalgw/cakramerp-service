import { BackupJob } from '../../domain/entities/backup-job.entity';
import { BackupHistory } from '../../domain/entities/backup-history.entity';
import { CreateBackupCommand } from '../commands/create-backup.command';
import { UpdateBackupCommand } from '../commands/update-backup.command';

export const BACKUP_SERVICE = Symbol('BACKUP_SERVICE');

export interface BackupServicePort {
  getAllBackupJobs(): Promise<BackupJob[]>;
  getBackupJobById(id: string): Promise<BackupJob>;
  createBackupJob(command: CreateBackupCommand): Promise<BackupJob>;
  updateBackupJob(command: UpdateBackupCommand): Promise<BackupJob>;
  triggerBackup(backupJobId: string): Promise<BackupHistory>;
  getBackupHistory(backupJobId: string): Promise<BackupHistory[]>;
  restoreBackup(backupHistoryId: string): Promise<void>;
}
