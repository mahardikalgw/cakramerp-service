import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import {
  FindOptions,
  FindResult,
  RepositoryPort,
} from '../../../shared/kernel/domain/repositories/repository.port';
import { BaseEntity } from '../../../shared/kernel/domain/entities/base.entity';

export abstract class BaseTypeOrmRepositoryAdapter<
  T extends BaseEntity,
  E extends ObjectLiteral,
> implements RepositoryPort<T> {
  protected abstract readonly repository: Repository<E>;

  constructor(protected readonly dataSource: DataSource) {}

  abstract toDomain(entity: E): T;
  abstract toEntity(domain: T): E;

  async findById(id: string): Promise<T | null> {
    const entity = await this.repository.findOne({ where: { id } as any });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: FindOptions): Promise<FindResult<T>> {
    const limit = options?.limit ?? 20;
    const page = options?.page ?? 1;
    const offset = options?.offset ?? (page - 1) * limit;

    const [entities, total] = await this.repository.findAndCount({
      take: limit,
      skip: offset,

      order: options?.orderBy
        ? ({ [options.orderBy]: options.orderDirection ?? 'ASC' } as any)
        : undefined,
    });

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

  async save(domain: T): Promise<T> {
    const entity = this.toEntity(domain);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async saveMany(domains: T[]): Promise<T[]> {
    const entities = domains.map((d) => this.toEntity(d));
    const saved = await this.repository.save(entities);
    return saved.map((e) => this.toDomain(e));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } as any });
    return count > 0;
  }
}
