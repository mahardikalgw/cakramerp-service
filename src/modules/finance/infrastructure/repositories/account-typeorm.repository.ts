import { Injectable } from '@nestjs/common'
import { Repository, DataSource } from 'typeorm'
import { AccountTypeOrmEntity } from '../entities/account-typeorm.entity'
import { Account } from '../../domain/entities/account.entity'
import { AccountRepositoryPort } from '../../domain/repositories/finance-repository.port'
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port'

@Injectable()
export class AccountTypeOrmRepository implements AccountRepositoryPort {
  private readonly repo: Repository<AccountTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(AccountTypeOrmEntity)
  }

  async findById(id: string): Promise<Account | null> {
    const entity = await this.repo.findOne({ where: { id } })
    return entity ? this.toDomain(entity) : null
  }

  async findAll(options?: { page?: number; limit?: number }): Promise<FindResult<Account>> {
    const [entities, total] = await this.repo.findAndCount({
      skip: ((options?.page ?? 1) - 1) * (options?.limit ?? 20),
      take: options?.limit ?? 20,
      order: { code: 'ASC' },
    })
    return {
      data: entities.map(this.toDomain),
      meta: {
        page: options?.page ?? 1,
        limit: options?.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (options?.limit ?? 20)),
        hasNextPage: (options?.page ?? 1) * (options?.limit ?? 20) < total,
        hasPrevPage: (options?.page ?? 1) > 1,
      },
    }
  }

  async findAllFlat(): Promise<Account[]> {
    const entities = await this.repo.find({ order: { code: 'ASC' } })
    return entities.map(this.toDomain)
  }

  async findByType(type: string): Promise<Account[]> {
    const entities = await this.repo.find({ where: { type }, order: { code: 'ASC' } })
    return entities.map(this.toDomain)
  }

  async findBySegment(segment: string): Promise<Account[]> {
    const entities = await this.repo.find({ where: { segment }, order: { code: 'ASC' } })
    return entities.map(this.toDomain)
  }

  async findActive(): Promise<Account[]> {
    const entities = await this.repo.find({ where: { isActive: true }, order: { code: 'ASC' } })
    return entities.map(this.toDomain)
  }

  async save(entity: Account): Promise<Account> {
    const saved = await this.repo.save(this.toEntity(entity))
    return this.toDomain(saved)
  }

  async saveMany(entities: Account[]): Promise<Account[]> {
    const saved = await this.repo.save(entities.map(this.toEntity))
    return saved.map(this.toDomain)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id)
    return (result.affected ?? 0) > 0
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repo.count({ where: { id } })
    return count > 0
  }

  async findByCode(code: string): Promise<Account | null> {
    const entity = await this.repo.findOne({ where: { code } })
    return entity ? this.toDomain(entity) : null
  }

  private toDomain(entity: AccountTypeOrmEntity): Account {
    return new Account({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type as any,
      taxCategory: entity.taxCategory ?? undefined,
      segment: entity.segment ?? undefined,
      costCenter: entity.costCenter ?? undefined,
      parentId: entity.parentId ?? undefined,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }

  private toEntity(domain: Account): AccountTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      code: domain.code,
      name: domain.name,
      type: domain.type,
      taxCategory: domain.taxCategory,
      segment: domain.segment,
      costCenter: domain.costCenter,
      parentId: domain.parentId,
      isActive: domain.isActive,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    })
  }
}
