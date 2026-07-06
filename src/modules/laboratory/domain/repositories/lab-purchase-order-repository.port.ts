import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { LabPurchaseOrder } from '../entities/lab-purchase-order.entity';

export const LAB_PURCHASE_ORDER_REPOSITORY = Symbol(
  'LAB_PURCHASE_ORDER_REPOSITORY',
);

export interface LabPurchaseOrderRepositoryPort extends RepositoryPort<LabPurchaseOrder> {
  findByPONumber(poNumber: string): Promise<LabPurchaseOrder | null>;
  getLastPONumber(): Promise<string | null>;
  softDelete(id: string): Promise<void>;
}
