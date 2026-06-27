import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type ContractInvoiceStatus = 'issued' | 'paid' | 'overdue' | 'cancelled';

export class ContractInvoice extends BaseEntity {
  declare id: string;
  declare invoiceNumber: string;
  declare contractId: string;
  declare billingPeriodStart: Date;
  declare billingPeriodEnd: Date;
  declare totalSamples: number;
  declare baseAmount: number;
  declare taxPercent: number;
  declare taxAmount: number;
  declare totalAmount: number;
  declare invoiceDocumentUrl: string | null;
  declare status: ContractInvoiceStatus;
  declare paidAt: Date | null;
  declare paidAmount: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<ContractInvoice> & {
      invoiceNumber: string;
      contractId: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
