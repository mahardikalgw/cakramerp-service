import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { Laboratory } from '../../domain/entities/laboratory.entity';
import { LaboratoryTypeOrmEntity } from '../entities/laboratory-typeorm.entity';
import { LaboratoryRepositoryPort } from '../../domain/repositories/laboratory-repository.port';

@Injectable()
export class LaboratoryTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Laboratory, LaboratoryTypeOrmEntity>
  implements LaboratoryRepositoryPort
{
  protected readonly repository: Repository<LaboratoryTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(LaboratoryTypeOrmEntity);
  }

  toDomain(entity: LaboratoryTypeOrmEntity): Laboratory {
    return new Laboratory({
      id: entity.id,
      name: entity.name,
      location: entity.location,
      capacity: entity.capacity,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Laboratory): LaboratoryTypeOrmEntity {
    const entity = new LaboratoryTypeOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.location = domain.location ?? '';
    entity.capacity = domain.capacity ?? 0;
    entity.isActive = domain.isActive ?? true;
    return entity;
  }
}
