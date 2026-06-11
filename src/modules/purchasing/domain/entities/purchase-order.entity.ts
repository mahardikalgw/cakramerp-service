import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';

export class PurchaseOrder extends BaseEntity {
  declare id: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare orderNumber: string;
  declare supplierId: string;
  declare supplierName: string;
  declare status: 'draft' | 'confirmed' | 'received' | 'closed' | 'cancelled';
  declare orderDate: Date;
  declare expectedDate: Date | null;
  declare totalAmount: number;
  declare notes: string | null;
  declare purchaseRequestId?: string;
  declare lines: PurchaseOrderLine[];
  paymentTermDays?: number;
  discountAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
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
