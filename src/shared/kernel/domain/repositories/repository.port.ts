import { BaseEntity } from '../entities/base.entity';

export interface FindOptions {
  page?: number;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FindResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface RepositoryPort<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<FindResult<T>>;
  save(entity: T): Promise<T>;
  saveMany(entities: T[]): Promise<T[]>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface CountRepositoryPort {
  countByAccountId(accountId: string): Promise<number>;
}
