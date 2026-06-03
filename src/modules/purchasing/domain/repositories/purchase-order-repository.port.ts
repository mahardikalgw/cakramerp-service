import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { PurchaseOrder } from '../entities/purchase-order.entity';

export const PURCHASE_ORDER_REPOSITORY = Symbol('PURCHASE_ORDER_REPOSITORY');

export interface PurchaseOrderRepositoryPort extends RepositoryPort<PurchaseOrder> {
  findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | null>;
  getLastOrderNumber(prefix: string): Promise<string | null>;
}
