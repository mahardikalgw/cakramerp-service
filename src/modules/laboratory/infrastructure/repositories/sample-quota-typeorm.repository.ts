import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { SampleQuota } from '../../domain/entities/sample-quota.entity';
import { SampleQuotaTypeOrmEntity } from '../entities/sample-quota-typeorm.entity';
import { SampleQuotaRepositoryPort } from '../../domain/repositories/sample-quota-repository.port';

@Injectable()
export class SampleQuotaTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    SampleQuota,
    SampleQuotaTypeOrmEntity
  >
  implements SampleQuotaRepositoryPort
{
  protected readonly repository: Repository<SampleQuotaTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SampleQuotaTypeOrmEntity);
  }

  toDomain(entity: SampleQuotaTypeOrmEntity): SampleQuota {
    return new SampleQuota({
      id: entity.id,
      testingRequestId: entity.testingRequestId,
      testingServiceId: entity.testingServiceId,
      testingServiceName: entity.testingServiceName,
      customerId: entity.customerId,
      totalQuota: entity.totalQuota,
      usedQuota: entity.usedQuota,
      remainingQuota: entity.remainingQuota,
      grantedAt: entity.grantedAt,
      grantedBy: entity.grantedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: SampleQuota): SampleQuotaTypeOrmEntity {
    const entity = new SampleQuotaTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.testingRequestId = domain.testingRequestId;
    entity.testingServiceId = domain.testingServiceId;
    entity.testingServiceName = domain.testingServiceName;
    entity.customerId = domain.customerId;
    entity.totalQuota = domain.totalQuota ?? 0;
    entity.usedQuota = domain.usedQuota ?? 0;
    entity.remainingQuota = domain.remainingQuota ?? domain.totalQuota ?? 0;
    entity.grantedAt = domain.grantedAt ?? new Date();
    entity.grantedBy = domain.grantedBy;
    return entity;
  }

  async findByTestingRequestId(requestId: string): Promise<SampleQuota[]> {
    const entities = await this.repository.find({
      where: { testingRequestId: requestId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByCustomerId(customerId: string): Promise<SampleQuota[]> {
    const entities = await this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async saveMany(quotas: SampleQuota[]): Promise<SampleQuota[]> {
    const entities = quotas.map((q) => this.toEntity(q));
    const saved = await this.repository.save(entities);
    return saved.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
