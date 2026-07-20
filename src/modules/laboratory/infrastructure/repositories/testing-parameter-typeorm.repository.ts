import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TestingParameter } from '../../domain/entities/testing-parameter.entity';
import { TestingParameterTypeOrmEntity } from '../entities/testing-parameter-typeorm.entity';
import { TestingParameterRepositoryPort } from '../../domain/repositories/testing-parameter-repository.port';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/soft-delete-typeorm-repository.adapter';

@Injectable()
export class TestingParameterTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<TestingParameter>
  implements TestingParameterRepositoryPort
{
  constructor(
    @InjectRepository(TestingParameterTypeOrmEntity)
    private readonly repo: Repository<TestingParameterTypeOrmEntity>,
  ) {
    super(repo, TestingParameter);
  }

  async findByTestingServiceId(serviceId: string): Promise<TestingParameter[]> {
    const entities = await this.repo.find({
      where: { testingServiceId: serviceId, isActive: true },
      order: { name: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  private toDomain(entity: TestingParameterTypeOrmEntity): TestingParameter {
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
}
