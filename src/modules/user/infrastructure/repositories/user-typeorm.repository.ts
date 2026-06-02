import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User, UserStatus } from '../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../domain/repositories/user-repository.port';
import {
  UserTypeOrmEntity,
  UserStatusTypeOrm,
} from '../entities/user-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class UserTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<User, UserTypeOrmEntity>
  implements UserRepositoryPort
{
  protected readonly repository: Repository<UserTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(UserTypeOrmEntity);
  }

  toDomain(entity: UserTypeOrmEntity): User {
    const roles = entity.roles?.map((r) => r.name) ?? [];
    const permissions =
      entity.roles?.flatMap((r) => r.permissions?.map((p) => p.name) ?? []) ??
      [];

    return new User({
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      firstName: entity.firstName,
      lastName: entity.lastName,
      status: entity.status as unknown as UserStatus,
      roles,
      permissions,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: User): UserTypeOrmEntity {
    const entity = new UserTypeOrmEntity();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.passwordHash = domain.passwordHash;
    entity.firstName = domain.firstName;
    entity.lastName = domain.lastName;
    entity.department = null;
    entity.status = domain.status as unknown as UserStatusTypeOrm;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmailWithRoles(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    return entity ? this.toDomain(entity) : null;
  }
}
