import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { LabScheduleSample } from '../../domain/entities/lab-schedule-sample.entity';
import { LabScheduleSampleTypeOrmEntity } from '../entities/lab-schedule-sample-typeorm.entity';
import { LabScheduleSampleRepositoryPort } from '../../domain/repositories/lab-schedule-sample-repository.port';

@Injectable()
export class LabScheduleSampleTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<LabScheduleSample, LabScheduleSampleTypeOrmEntity>
  implements LabScheduleSampleRepositoryPort
{
  protected readonly repository: Repository<LabScheduleSampleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(LabScheduleSampleTypeOrmEntity);
  }

  toDomain(entity: LabScheduleSampleTypeOrmEntity): LabScheduleSample {
    return new LabScheduleSample({
      id: entity.id,
      scheduleId: entity.scheduleId,
      contractSampleId: entity.contractSampleId,
      serviceName: entity.serviceName,
      sampleCode: entity.sampleCode,
      allocatedQuantity: entity.allocatedQuantity ?? 1,
      usedQuantity: entity.usedQuantity ?? 0,
      completedQuantity: entity.completedQuantity ?? 0,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: LabScheduleSample): LabScheduleSampleTypeOrmEntity {
    const entity = new LabScheduleSampleTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.scheduleId = domain.scheduleId;
    entity.contractSampleId = domain.contractSampleId;
    entity.serviceName = domain.serviceName;
    entity.sampleCode = domain.sampleCode ?? '';
    entity.allocatedQuantity = domain.allocatedQuantity ?? 1;
    entity.usedQuantity = domain.usedQuantity ?? 0;
    entity.completedQuantity = domain.completedQuantity ?? 0;
    return entity;
  }

  async findByScheduleId(scheduleId: string): Promise<LabScheduleSample[]> {
    const entities = await this.repository.find({ where: { scheduleId } });
    return entities.map((e) => this.toDomain(e));
  }
}
