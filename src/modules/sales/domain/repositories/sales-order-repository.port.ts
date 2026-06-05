import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { SalesOrder } from '../entities/sales-order.entity';

export const SALES_ORDER_REPOSITORY = Symbol('SALES_ORDER_REPOSITORY');

export interface SalesOrderRepositoryPort extends RepositoryPort<SalesOrder> {
  findBySoNumber(soNumber: string): Promise<SalesOrder | null>;
  getLastSoNumber(prefix: string): Promise<string | null>;
}
