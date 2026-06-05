import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class QuotationLine extends BaseEntity {
  declare id: string;
  declare quotationId?: string;
  declare itemId: string | null;
  declare itemName: string;
  declare description: string | null;
  declare quantity: number;
  declare uom: string | null;
  declare unitPrice: number;
  declare taxPercent: number;
  declare amount: number;
  declare discountAmount: number;
  declare lineType: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<QuotationLine> & {
      itemName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
