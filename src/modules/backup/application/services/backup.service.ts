import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  BackupJob,
  BackupJobStatus,
} from '../../domain/entities/backup-job.entity';
import { BackupHistoryStatus } from '../../domain/entities/backup-history.entity';
import type { BackupJobRepositoryPort } from '../../domain/repositories/backup-job-repository.port';
import { BACKUP_JOB_REPOSITORY } from '../../domain/repositories/backup-job-repository.port';
import type { BackupHistoryRepositoryPort } from '../../domain/repositories/backup-history-repository.port';
import { BACKUP_HISTORY_REPOSITORY } from '../../domain/repositories/backup-history-repository.port';
import { CreateBackupCommand } from '../commands/create-backup.command';
import { UpdateBackupCommand } from '../commands/update-backup.command';
import { BackupHistory } from '../../domain/entities/backup-history.entity';
import { BackupServicePort } from '../ports/backup-service.port';

@Injectable()
export class BackupService implements BackupServicePort {
  constructor(
    @Inject(BACKUP_JOB_REPOSITORY)
    private readonly backupJobRepository: BackupJobRepositoryPort,
    @Inject(BACKUP_HISTORY_REPOSITORY)
    private readonly backupHistoryRepository: BackupHistoryRepositoryPort,
  ) {}

  async getAllBackupJobs(): Promise<BackupJob[]> {
    const result = await this.backupJobRepository.findAll();
    return result.data;
  }

  async getBackupJobById(id: string): Promise<BackupJob> {
    const backupJob = await this.backupJobRepository.findById(id);
    if (!backupJob) throw new NotFoundException('Backup job not found');
    return backupJob;
  }

  async createBackupJob(command: CreateBackupCommand): Promise<BackupJob> {
    const backupJob = new BackupJob({
      name: command.name,
      schedule: command.schedule,
      retentionDays: command.retentionDays,
    });
    return this.backupJobRepository.save(backupJob);
  }

  async updateBackupJob(command: UpdateBackupCommand): Promise<BackupJob> {
    const backupJob = await this.backupJobRepository.findById(command.id);
    if (!backupJob) throw new NotFoundException('Backup job not found');

    if (command.name) backupJob.name = command.name;
    if (command.schedule) backupJob.schedule = command.schedule;
    if (command.status) backupJob.status = command.status as BackupJobStatus;
    if (command.retentionDays !== undefined)
      backupJob.retentionDays = command.retentionDays;

    return this.backupJobRepository.save(backupJob);
  }

  async triggerBackup(backupJobId: string): Promise<BackupHistory> {
    const backupJob = await this.backupJobRepository.findById(backupJobId);
    if (!backupJob) throw new NotFoundException('Backup job not found');

    // TODO: Implement actual backup logic using pg_dump or similar
    const fileName = `backup_${backupJobId}_${Date.now()}.sql`;
    const backupHistory = new BackupHistory({
      backupJobId,
      fileName,
      status: BackupHistoryStatus.IN_PROGRESS,
      size: 0,
    });

    return this.backupHistoryRepository.save(backupHistory);
  }

  async getBackupHistory(backupJobId: string): Promise<BackupHistory[]> {
    return this.backupHistoryRepository.findByBackupJobId(backupJobId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async restoreBackup(backupHistoryId: string): Promise<void> {
    // TODO: Implement actual restore logic using psql or similar
    console.log(`Restoring backup: ${backupHistoryId}`);
  }
}
