import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class PurchaseOrderLine extends BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrderId?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  uom: string;
  unitCost: number;
  totalCost: number;

  constructor(
    props: Partial<PurchaseOrderLine> & {
      itemId: string;
      itemName: string;
      quantity: number;
      uom: string;
      unitCost: number;
      totalCost: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
