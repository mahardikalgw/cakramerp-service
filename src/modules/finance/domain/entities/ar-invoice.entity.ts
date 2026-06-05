import { Decimal } from 'decimal.js';
import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export class ARInvoice extends BaseEntity {
  declare id: string;
  declare invoiceNumber: string;
  declare clientId: string;
  declare clientName: string;
  declare projectId?: string;
  declare segment?: string;
  declare amount: Decimal;
  declare paidAmount: Decimal;
  declare dueDate: Date;
  declare issueDate: Date;
  declare status: InvoiceStatus;
  declare createdAt: Date;
  declare updatedAt: Date;

  get balance(): Decimal {
    return this.amount.minus(this.paidAmount);
  }

  get daysOverdue(): number {
    if (this.status !== 'overdue') return 0;
    const diff = Date.now() - this.dueDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  constructor(
    props: Partial<ARInvoice> & {
      invoiceNumber: string;
      clientId: string;
      clientName: string;
      amount: Decimal;
      dueDate: Date;
    },
  ) {
    super();
    Object.assign(this, props);
    this.paidAmount = props.paidAmount ?? new Decimal(0);
    this.status = props.status ?? 'draft';
    this.issueDate = props.issueDate ?? new Date();
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
