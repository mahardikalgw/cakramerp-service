import { DataSource, IsNull, Not, ObjectLiteral, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { BaseEntity } from '../../../shared/kernel/domain/entities/base.entity';
import {
  FindOptions,
  FindResult,
} from '../../../shared/kernel/domain/repositories/repository.port';

/**
 * Marker for entities that support TypeORM soft deletes.
 */
export interface SoftDeletableEntity {
  deletedAt: Date | null;
}

/**
 * Laboratory-specific repository helper that adds soft-delete awareness on
 * top of the shared BaseTypeOrmRepositoryAdapter without modifying it.
 *
 * Usage: laboratory repositories extend this class instead of
 * BaseTypeOrmRepositoryAdapter.
 */
export abstract class SoftDeleteTypeOrmRepositoryAdapter<
  T extends BaseEntity,
  E extends ObjectLiteral & SoftDeletableEntity,
> extends BaseTypeOrmRepositoryAdapter<T, E> {
  protected abstract readonly repository: Repository<E>;

  constructor(protected readonly dataSource: DataSource) {
    super(dataSource);
  }

  /**
   * Find a single non-deleted record by id.
   */
  async findById(id: string): Promise<T | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() } as any,
    });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * List records, excluding soft-deleted rows by default.
   */
  async findAll(options?: FindOptions): Promise<FindResult<T>> {
    const filteredOptions: FindOptions = {
      ...options,
      filters: this.withSoftDeleteFilter(options?.filters),
    };
    return super.findAll(filteredOptions);
  }

  /**
   * List records including soft-deleted rows.
   */
  async findWithDeleted(options?: FindOptions): Promise<FindResult<T>> {
    return super.findAll(options);
  }

  /**
   * List only soft-deleted records.
   */
  async findOnlyDeleted(options?: FindOptions): Promise<FindResult<T>> {
    const deletedOptions: FindOptions = {
      ...options,
      filters: {
        ...options?.filters,
        deletedAt: Not(IsNull()),
      },
    };
    return super.findAll(deletedOptions);
  }

  /**
   * Soft-remove a record by id (sets deleted_at).
   */
  async softRemove(id: string): Promise<boolean> {
    const result = await this.repository.update(id, {
      deletedAt: new Date(),
    } as any);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Alias for softRemove that returns void.
   */
  async softDelete(id: string): Promise<void> {
    await this.softRemove(id);
  }

  /**
   * Override base delete to perform a soft delete via update.
   */
  async delete(id: string): Promise<boolean> {
    return this.softRemove(id);
  }

  /**
   * Check whether a non-deleted record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id, deletedAt: IsNull() } as any,
    });
    return count > 0;
  }

  /**
   * Check whether a record exists regardless of soft-delete state.
   */
  async existsIncludingDeleted(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } as any });
    return count > 0;
  }

  /**
   * Check whether a soft-deleted record exists.
   */
  async existsDeleted(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { id, deletedAt: Not(IsNull()) } as any,
    });
    return count > 0;
  }

  /**
   * Inject `deletedAt IS NULL` into the filter object unless the caller
   * explicitly supplied a `deletedAt` filter.
   */
  private withSoftDeleteFilter(
    filters?: Record<string, any>,
  ): Record<string, any> {
    if (filters && Object.prototype.hasOwnProperty.call(filters, 'deletedAt')) {
      return filters;
    }
    return { ...filters, deletedAt: IsNull() };
  }
}
