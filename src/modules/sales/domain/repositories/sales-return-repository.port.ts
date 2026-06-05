import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { SalesReturn } from '../entities/sales-return.entity';

export const SALES_RETURN_REPOSITORY = Symbol('SALES_RETURN_REPOSITORY');

export interface SalesReturnRepositoryPort extends RepositoryPort<SalesReturn> {
  findByReturnNumber(returnNumber: string): Promise<SalesReturn | null>;
  getLastReturnNumber(prefix: string): Promise<string | null>;
}
