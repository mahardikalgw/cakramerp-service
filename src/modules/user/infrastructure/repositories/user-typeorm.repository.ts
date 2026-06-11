import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User, UserStatus } from '../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../domain/repositories/user-repository.port';
import {
  UserTypeOrmEntity,
  UserStatusTypeOrm,
} from '../entities/user-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import {
  FindOptions,
  FindResult,
} from '../../../../shared/kernel/domain/repositories/repository.port';

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

  async findAll(options?: FindOptions): Promise<FindResult<User>> {
    const limit = options?.limit ?? 20;
    const page = options?.page ?? 1;
    const offset = options?.offset ?? (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .leftJoinAndSelect('r.permissions', 'p');

    if (options?.filters?.search) {
      const search = options.filters.search;
      qb.andWhere(
        `(u.firstName ILIKE :search OR u.lastName ILIKE :search OR u.email ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    if (options?.filters?.status) {
      qb.andWhere('u.status = :status', { status: options.filters.status });
    }

    if (options?.filters?.role) {
      qb.andWhere('r.name = :role', { role: options.filters.role });
    }

    const [entities, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: entities.map((e) => this.toDomain(e)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    return entity ? this.toDomain(entity) : null;
  }
}
