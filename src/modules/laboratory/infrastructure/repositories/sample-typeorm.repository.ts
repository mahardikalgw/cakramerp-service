import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { Sample } from '../../domain/entities/sample.entity';
import { SampleTypeOrmEntity } from '../entities/sample-typeorm.entity';
import { SampleRepositoryPort } from '../../domain/repositories/sample-repository.port';

@Injectable()
export class SampleTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<Sample, SampleTypeOrmEntity>
  implements SampleRepositoryPort
{
  protected readonly repository: Repository<SampleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SampleTypeOrmEntity);
  }

  toDomain(entity: SampleTypeOrmEntity): Sample {
    return new Sample({
      id: entity.id,
      sampleCode: entity.sampleCode,
      sampleTypeId: entity.sampleTypeId,
      sampleTypeName: entity.sampleTypeName,
      testingRequestId: entity.testingRequestId,
      testingRequestNumber: entity.testingRequestNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      weight: entity.weight ? Number(entity.weight) : null,
      quantity: entity.quantity ? Number(entity.quantity) : null,
      location: entity.location,
      description: entity.description,
      status: entity.status as Sample['status'],
      receivedAt: entity.receivedAt,
      receivedBy: entity.receivedBy,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Sample): SampleTypeOrmEntity {
    const entity = new SampleTypeOrmEntity();
    entity.id = domain.id;
    entity.sampleCode = domain.sampleCode;
    entity.sampleTypeId = domain.sampleTypeId;
    entity.sampleTypeName = domain.sampleTypeName;
    entity.testingRequestId = domain.testingRequestId ?? null;
    entity.testingRequestNumber = domain.testingRequestNumber ?? null;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName;
    entity.weight = domain.weight as any;
    entity.quantity = domain.quantity as any;
    entity.location = domain.location ?? null;
    entity.description = domain.description ?? null;
    entity.status = domain.status ?? 'awaiting_delivery';
    entity.receivedAt = domain.receivedAt as any;
    entity.receivedBy = domain.receivedBy ?? null;
    entity.notes = domain.notes ?? null;
    return entity;
  }

  async findBySampleCode(sampleCode: string): Promise<Sample | null> {
    const entity = await this.repository.findOne({
      where: { sampleCode, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastSampleCode(): Promise<string | null> {
    const year = new Date().getFullYear();
    const row = await this.repository
      .createQueryBuilder('s')
      .select('s.sample_code', 'sampleCode')
      .where('s.sample_code LIKE :prefix', { prefix: `SPL-${year}-%` })
      .andWhere('s.deleted_at IS NULL')
      .orderBy('s.created_at', 'DESC')
      .limit(1)
      .getRawOne();
    return row?.sampleCode ?? null;
  }

  async findByTestingRequestId(testingRequestId: string): Promise<Sample[]> {
    const entities = await this.repository.find({
      where: { testingRequestId, deletedAt: IsNull() } as any,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
