import { Decimal } from 'decimal.js';
import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PaymentStatus = 'scheduled' | 'paid' | 'overdue';

export class APPayment extends BaseEntity {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: Decimal;
  scheduledDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  category: string;
  createdAt: Date;
  updatedAt: Date;

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
