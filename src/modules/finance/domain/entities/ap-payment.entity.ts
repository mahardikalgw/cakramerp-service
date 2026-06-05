import { Decimal } from 'decimal.js';
import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PaymentStatus = 'scheduled' | 'paid' | 'overdue';

export class APPayment extends BaseEntity {
  declare id: string;
  declare vendorId: string;
  declare vendorName: string;
  declare amount: Decimal;
  declare scheduledDate: Date;
  declare paidDate?: Date;
  declare status: PaymentStatus;
  declare category: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<APPayment> & {
      vendorId: string;
      vendorName: string;
      amount: Decimal;
      scheduledDate: Date;
    },
  ) {
    super();
    Object.assign(this, props);
    this.status = props.status ?? 'scheduled';
    this.category = props.category ?? 'operations';
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
