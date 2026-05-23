import { BackupJob } from '../../../domain/entities/backup-job.entity';

export class BackupJobResponseDto {
  id: string;
  name: string;
  schedule: string;
  status: string;
  lastRun: Date | null;
  nextRun: Date | null;
  lastSize: string | null;
  retentionDays: number | null;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(backupJob: BackupJob): BackupJobResponseDto {
    const dto = new BackupJobResponseDto();
    dto.id = backupJob.id;
    dto.name = backupJob.name;
    dto.schedule = backupJob.schedule;
    dto.status = backupJob.status;
    dto.lastRun = backupJob.lastRun;
    dto.nextRun = backupJob.nextRun;
    dto.lastSize = backupJob.lastSize;
    dto.retentionDays = backupJob.retentionDays;
    dto.createdAt = backupJob.createdAt;
    dto.updatedAt = backupJob.updatedAt;
    return dto;
  }
}
