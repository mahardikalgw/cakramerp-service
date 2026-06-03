import { CreatePurchaseOrderCommand } from '../commands/create-purchase-order.command';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';

export const PURCHASING_SERVICE = Symbol('PURCHASING_SERVICE');

export interface PurchasingServicePort {
  createPurchaseOrder(
    command: CreatePurchaseOrderCommand,
  ): Promise<PurchaseOrder>;
  findPurchaseOrderById(id: string): Promise<PurchaseOrder | null>;
  findPurchaseOrders(options?: { page?: number; limit?: number }): Promise<{
    data: PurchaseOrder[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
}
