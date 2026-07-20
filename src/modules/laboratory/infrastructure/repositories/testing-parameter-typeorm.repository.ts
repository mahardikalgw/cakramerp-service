import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TestingParameter } from '../../domain/entities/testing-parameter.entity';
import { TestingParameterTypeOrmEntity } from '../entities/testing-parameter-typeorm.entity';
import { TestingParameterRepositoryPort } from '../../domain/repositories/testing-parameter-repository.port';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';

@Injectable()
export class TestingParameterTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    TestingParameter,
    TestingParameterTypeOrmEntity
  >
  implements TestingParameterRepositoryPort
{
  protected readonly repository: Repository<TestingParameterTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(TestingParameterTypeOrmEntity);
  }

  toDomain(entity: TestingParameterTypeOrmEntity): TestingParameter {
    return new TestingParameter({
      id: entity.id,
      testingServiceId: entity.testingServiceId,
      name: entity.name,
      standard: entity.standard,
      unit: entity.unit,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: TestingParameter): TestingParameterTypeOrmEntity {
    const entity = new TestingParameterTypeOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.testingServiceId = domain.testingServiceId;
    entity.name = domain.name;
    entity.standard = domain.standard ?? '';
    entity.unit = domain.unit ?? '';
    entity.isActive = domain.isActive;
    return entity;
  }

  async findByTestingServiceId(serviceId: string): Promise<TestingParameter[]> {
    const entities = await this.repository.find({
      where: { testingServiceId: serviceId, isActive: true } as any,
      order: { name: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
