import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BACKUP_JOB_REPOSITORY } from '../../domain/repositories/backup-job-repository.port';
import { BACKUP_HISTORY_REPOSITORY } from '../../domain/repositories/backup-history-repository.port';
import { BackupJob, BackupJobStatus } from '../../domain/entities/backup-job.entity';
import { BackupHistory, BackupHistoryStatus } from '../../domain/entities/backup-history.entity';
import { CreateBackupCommand } from '../commands/create-backup.command';
import { UpdateBackupCommand } from '../commands/update-backup.command';

describe('BackupService', () => {
  let service: BackupService;

  const mockJobRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByStatus: jest.fn(),
  };

  const mockHistoryRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByBackupJobId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: BACKUP_JOB_REPOSITORY, useValue: mockJobRepo },
        { provide: BACKUP_HISTORY_REPOSITORY, useValue: mockHistoryRepo },
      ],
    }).compile();

    service = module.get(BackupService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllBackupJobs', () => {
    it('should return all backup jobs', async () => {
      const jobs = [
        { id: '1', name: 'Daily Backup' },
        { id: '2', name: 'Weekly Backup' },
      ];
      mockJobRepo.findAll.mockResolvedValue({ data: jobs, meta: { total: 2 } });

      const result = await service.getAllBackupJobs();

      expect(result).toEqual(jobs);
      expect(mockJobRepo.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no jobs exist', async () => {
      mockJobRepo.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await service.getAllBackupJobs();

      expect(result).toEqual([]);
    });
  });

  describe('getBackupJobById', () => {
    it('should return a backup job by id', async () => {
      const job = { id: '1', name: 'Daily Backup', schedule: '0 2 * * *' };
      mockJobRepo.findById.mockResolvedValue(job);

      const result = await service.getBackupJobById('1');

      expect(result).toEqual(job);
      expect(mockJobRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if backup job not found', async () => {
      mockJobRepo.findById.mockResolvedValue(null);

      await expect(service.getBackupJobById('999')).rejects.toThrow(NotFoundException);
      await expect(service.getBackupJobById('999')).rejects.toThrow('Backup job not found');
    });
  });

  describe('createBackupJob', () => {
    it('should create a backup job', async () => {
      const command = new CreateBackupCommand('Daily Backup', '0 2 * * *', 30);
      const saved = { id: '1', name: 'Daily Backup', schedule: '0 2 * * *', retentionDays: 30 };
      mockJobRepo.save.mockResolvedValue(saved);

      const result = await service.createBackupJob(command);

      expect(result).toEqual(saved);
      expect(mockJobRepo.save).toHaveBeenCalledTimes(1);
      const savedEntity = mockJobRepo.save.mock.calls[0][0];
      expect(savedEntity.name).toBe('Daily Backup');
      expect(savedEntity.schedule).toBe('0 2 * * *');
      expect(savedEntity.retentionDays).toBe(30);
    });

    it('should create a backup job without retentionDays', async () => {
      const command = new CreateBackupCommand('Weekly Backup', '0 3 * * 0');
      mockJobRepo.save.mockImplementation(async (job) => ({ id: '1', ...job }));

      const result = await service.createBackupJob(command);

      expect(result.name).toBe('Weekly Backup');
      expect(result.schedule).toBe('0 3 * * 0');
    });
  });

  describe('updateBackupJob', () => {
    it('should update a backup job', async () => {
      const entity = { id: '1', name: 'Old Name', schedule: '0 2 * * *', status: BackupJobStatus.ACTIVE, retentionDays: 7 };
      const command = new UpdateBackupCommand('1', 'New Name', '0 3 * * *', 'inactive', 30);
      mockJobRepo.findById.mockResolvedValue(entity);
      mockJobRepo.save.mockResolvedValue({ ...entity, name: 'New Name', schedule: '0 3 * * *' });

      const result = await service.updateBackupJob(command);

      expect(mockJobRepo.findById).toHaveBeenCalledWith('1');
      expect(mockJobRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
      expect(result.schedule).toBe('0 3 * * *');
    });

    it('should update only provided fields', async () => {
      const entity = { id: '1', name: 'Old Name', schedule: '0 2 * * *', status: BackupJobStatus.ACTIVE, retentionDays: 7 };
      const command = new UpdateBackupCommand('1', 'New Name');
      mockJobRepo.findById.mockResolvedValue(entity);
      mockJobRepo.save.mockImplementation(async (e) => e);

      const result = await service.updateBackupJob(command);

      expect(result.name).toBe('New Name');
      expect(result.schedule).toBe('0 2 * * *');
      expect(result.retentionDays).toBe(7);
    });

    it('should update retentionDays when provided', async () => {
      const entity = { id: '1', name: 'Test', schedule: '0 2 * * *', status: BackupJobStatus.ACTIVE, retentionDays: 7 };
      const command = new UpdateBackupCommand('1', undefined, undefined, undefined, 60);
      mockJobRepo.findById.mockResolvedValue(entity);
      mockJobRepo.save.mockImplementation(async (e) => e);

      const result = await service.updateBackupJob(command);

      expect(result.retentionDays).toBe(60);
    });

    it('should throw NotFoundException if backup job not found', async () => {
      const command = new UpdateBackupCommand('999', 'Test');
      mockJobRepo.findById.mockResolvedValue(null);

      await expect(service.updateBackupJob(command)).rejects.toThrow(NotFoundException);
      await expect(service.updateBackupJob(command)).rejects.toThrow('Backup job not found');
    });
  });

  describe('triggerBackup', () => {
    it('should trigger a backup and create history entry', async () => {
      const job = { id: '1', name: 'Daily Backup', schedule: '0 2 * * *' };
      mockJobRepo.findById.mockResolvedValue(job);
      mockHistoryRepo.save.mockImplementation(async (h) => ({ id: 'h1', ...h }));

      const result = await service.triggerBackup('1');

      expect(mockJobRepo.findById).toHaveBeenCalledWith('1');
      expect(mockHistoryRepo.save).toHaveBeenCalledTimes(1);
      expect(result.backupJobId).toBe('1');
      expect(result.status).toBe(BackupHistoryStatus.IN_PROGRESS);
      expect(result.fileName).toContain('backup_1_');
      expect(result.size).toBe(0);
    });

    it('should throw NotFoundException if backup job not found', async () => {
      mockJobRepo.findById.mockResolvedValue(null);

      await expect(service.triggerBackup('999')).rejects.toThrow(NotFoundException);
      await expect(service.triggerBackup('999')).rejects.toThrow('Backup job not found');
    });
  });

  describe('getBackupHistory', () => {
    it('should return backup history for a job', async () => {
      const history = [
        { id: 'h1', backupJobId: '1', status: 'success' },
        { id: 'h2', backupJobId: '1', status: 'failed' },
      ];
      mockHistoryRepo.findByBackupJobId.mockResolvedValue(history);

      const result = await service.getBackupHistory('1');

      expect(result).toEqual(history);
      expect(mockHistoryRepo.findByBackupJobId).toHaveBeenCalledWith('1');
    });

    it('should return empty array when no history exists', async () => {
      mockHistoryRepo.findByBackupJobId.mockResolvedValue([]);

      const result = await service.getBackupHistory('1');

      expect(result).toEqual([]);
    });
  });

  describe('restoreBackup', () => {
    it('should restore a backup', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.restoreBackup('h1');

      expect(consoleSpy).toHaveBeenCalledWith('Restoring backup: h1');
      consoleSpy.mockRestore();
    });
  });
});
