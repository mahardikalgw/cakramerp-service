import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { TestingService } from '../../domain/entities/testing-service.entity';
import { TestingServiceTypeOrmEntity } from '../entities/testing-service-typeorm.entity';
import { TestingServiceRepositoryPort } from '../../domain/repositories/testing-service-repository.port';

@Injectable()
export class TestingServiceTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    TestingService,
    TestingServiceTypeOrmEntity
  >
  implements TestingServiceRepositoryPort
{
  protected readonly repository: Repository<TestingServiceTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestingServiceTypeOrmEntity);
  }

  toDomain(entity: TestingServiceTypeOrmEntity): TestingService {
    return new TestingService({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      unitPrice: Number(entity.unitPrice),
      measurementUnit: entity.measurementUnit,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: TestingService): TestingServiceTypeOrmEntity {
    const entity = new TestingServiceTypeOrmEntity();
    entity.id = domain.id;
    entity.code = domain.code;
    entity.name = domain.name;
    entity.unitPrice = domain.unitPrice;
    entity.measurementUnit = domain.measurementUnit ?? '';
    entity.description = domain.description ?? '';
    entity.isActive = domain.isActive ?? true;
    return entity;
  }

  async findByCode(code: string): Promise<TestingService | null> {
    const entity = await this.repository.findOne({ where: { code } as any });
    return entity ? this.toDomain(entity) : null;
  }
}
