import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class SalesReturnLine extends BaseEntity {
  declare id: string;
  declare salesReturnId?: string;
  declare itemId: string | null;
  declare itemName: string;
  declare quantity: number;
  declare uom: string | null;
  declare unitPrice: number;
  declare amount: number;
  declare reason: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<SalesReturnLine> & {
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
