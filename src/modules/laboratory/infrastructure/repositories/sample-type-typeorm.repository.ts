import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SoftDeleteTypeOrmRepositoryAdapter } from '../../shared/soft-delete.helper';
import { SampleType } from '../../domain/entities/sample-type.entity';
import { SampleTypeTypeOrmEntity } from '../entities/sample-type-typeorm.entity';
import { SampleTypeRepositoryPort } from '../../domain/repositories/sample-type-repository.port';

@Injectable()
export class SampleTypeTypeOrmRepository
  extends SoftDeleteTypeOrmRepositoryAdapter<
    SampleType,
    SampleTypeTypeOrmEntity
  >
  implements SampleTypeRepositoryPort
{
  protected readonly repository: Repository<SampleTypeTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SampleTypeTypeOrmEntity);
  }

  toDomain(entity: SampleTypeTypeOrmEntity): SampleType {
    return new SampleType({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: SampleType): SampleTypeTypeOrmEntity {
    const entity = new SampleTypeTypeOrmEntity();
    entity.id = domain.id;
    entity.code = domain.code;
    entity.name = domain.name;
    entity.description = domain.description ?? '';
    entity.isActive = domain.isActive ?? true;
    return entity;
  }

  async findByCode(code: string): Promise<SampleType | null> {
    const entity = await this.repository.findOne({
      where: { code, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }
}
