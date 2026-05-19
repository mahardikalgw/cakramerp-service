import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../../domain/entities/role.entity';
import { Permission } from '../../domain/entities/permission.entity';
import { RoleRepositoryPort } from '../../domain/repositories/role-repository.port';
import { RoleTypeOrmEntity } from '../entities/role-typeorm.entity';
import { PermissionTypeOrmEntity } from '../entities/permission-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class RoleTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Role, RoleTypeOrmEntity>
  implements RoleRepositoryPort
{
  protected readonly repository: Repository<RoleTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(RoleTypeOrmEntity);
  }

  toDomain(entity: RoleTypeOrmEntity): Role {
    return new Role({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      permissions:
        entity.permissions?.map(
          (p) =>
            new Permission({
              id: p.id,
              name: p.name,
              resource: p.resource,
              action: p.action,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }),
        ) ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Role): RoleTypeOrmEntity {
    const entity = new RoleTypeOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.description = domain.description;
    entity.permissions = domain.permissions?.map((p) => {
      const pe = new PermissionTypeOrmEntity();
      pe.id = p.id;
      return pe;
    });
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByName(name: string): Promise<Role | null> {
    const entity = await this.repository.findOne({ where: { name } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByNameWithPermissions(name: string): Promise<Role | null> {
    const entity = await this.repository.findOne({
      where: { name },
      relations: ['permissions'],
    });
    return entity ? this.toDomain(entity) : null;
  }
}
