import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Permission } from '../../domain/entities/permission.entity';
import { PermissionRepositoryPort } from '../../domain/repositories/permission-repository.port';
import { PermissionTypeOrmEntity } from '../entities/permission-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class PermissionTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Permission, PermissionTypeOrmEntity>
  implements PermissionRepositoryPort
{
  protected readonly repository: Repository<PermissionTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(PermissionTypeOrmEntity);
  }

  toDomain(entity: PermissionTypeOrmEntity): Permission {
    return new Permission({
      id: entity.id,
      name: entity.name,
      resource: entity.resource,
      action: entity.action,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Permission): PermissionTypeOrmEntity {
    const entity = new PermissionTypeOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.resource = domain.resource;
    entity.action = domain.action;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByName(name: string): Promise<Permission | null> {
    const entity = await this.repository.findOne({ where: { name } });
    return entity ? this.toDomain(entity) : null;
  }
}
