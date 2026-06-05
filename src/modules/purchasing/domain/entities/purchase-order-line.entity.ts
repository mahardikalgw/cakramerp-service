import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class PurchaseOrderLine extends BaseEntity {
  declare id: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  purchaseOrderId?: string;
  declare itemId: string;
  declare itemName: string;
  declare quantity: number;
  declare uom: string;
  declare unitCost: number;
  declare totalCost: number;

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
