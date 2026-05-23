import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  BackupJob,
  BackupJobStatus,
} from '../../domain/entities/backup-job.entity';
import { BackupJobRepositoryPort } from '../../domain/repositories/backup-job-repository.port';
import {
  BackupJobTypeOrmEntity,
  BackupStatus,
} from '../entities/backup-job-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class BackupJobTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<BackupJob, BackupJobTypeOrmEntity>
  implements BackupJobRepositoryPort
{
  protected readonly repository: Repository<BackupJobTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(BackupJobTypeOrmEntity);
  }

  toDomain(entity: BackupJobTypeOrmEntity): BackupJob {
    return new BackupJob({
      id: entity.id,
      name: entity.name,
      schedule: entity.schedule,
      status: entity.status as unknown as BackupJobStatus,
      lastRun: entity.lastRun,
      nextRun: entity.nextRun,
      lastSize: entity.lastSize,
      retentionDays: entity.retentionDays,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: BackupJob): BackupJobTypeOrmEntity {
    const entity = new BackupJobTypeOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.schedule = domain.schedule;
    entity.status = domain.status as unknown as BackupStatus;
    entity.lastRun = domain.lastRun;
    entity.nextRun = domain.nextRun;
    entity.lastSize = domain.lastSize;
    entity.retentionDays = domain.retentionDays;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByStatus(status: string): Promise<BackupJob[]> {
    const entities = await this.repository.find({
      where: { status: status as BackupStatus },
    });
    return entities.map((entity) => this.toDomain(entity));
  }
}
