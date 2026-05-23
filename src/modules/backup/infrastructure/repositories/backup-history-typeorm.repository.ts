import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BackupHistory } from '../../domain/entities/backup-history.entity';
import { BackupHistoryRepositoryPort } from '../../domain/repositories/backup-history-repository.port';
import { BackupHistoryTypeOrmEntity } from '../entities/backup-history-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class BackupHistoryTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    BackupHistory,
    BackupHistoryTypeOrmEntity
  >
  implements BackupHistoryRepositoryPort
{
  protected readonly repository: Repository<BackupHistoryTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(BackupHistoryTypeOrmEntity);
  }

  toDomain(entity: BackupHistoryTypeOrmEntity): BackupHistory {
    return new BackupHistory({
      id: entity.id,
      backupJobId: entity.backupJobId,
      fileName: entity.fileName,
      status: entity.status,
      size: entity.size,
      completedAt: entity.completedAt,
      errorMessage: entity.errorMessage,
      filePath: entity.filePath,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: BackupHistory): BackupHistoryTypeOrmEntity {
    const entity = new BackupHistoryTypeOrmEntity();
    entity.id = domain.id;
    entity.backupJobId = domain.backupJobId;
    entity.fileName = domain.fileName;
    entity.status = domain.status;
    entity.size = domain.size;
    entity.completedAt = domain.completedAt;
    entity.errorMessage = domain.errorMessage;
    entity.filePath = domain.filePath;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByBackupJobId(backupJobId: string): Promise<BackupHistory[]> {
    const entities = await this.repository.find({
      where: { backupJobId },
      order: { completedAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }
}
