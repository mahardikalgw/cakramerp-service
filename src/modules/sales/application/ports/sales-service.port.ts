import { CreateSalesOrderCommand } from '../commands/create-sales-order.command';
import { SalesOrder } from '../../domain/entities/sales-order.entity';

export const SALES_SERVICE = Symbol('SALES_SERVICE');

export interface SalesServicePort {
  createSalesOrder(command: CreateSalesOrderCommand): Promise<SalesOrder>;
  findSalesOrderById(id: string): Promise<SalesOrder | null>;
  findSalesOrders(options?: { page?: number; limit?: number }): Promise<{
    data: SalesOrder[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
}
