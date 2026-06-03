import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';

export class PurchaseOrder extends BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'confirmed' | 'received' | 'closed' | 'cancelled';
  orderDate: Date;
  expectedDate: Date | null;
  totalAmount: number;
  notes: string | null;
  lines: PurchaseOrderLine[];
  createdBy?: string;

  constructor(
    props: Partial<PurchaseOrder> & {
      orderNumber: string;
      supplierId: string;
      supplierName: string;
      status: PurchaseOrder['status'];
      orderDate: Date;
      totalAmount: number;
      lines: PurchaseOrderLine[];
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
