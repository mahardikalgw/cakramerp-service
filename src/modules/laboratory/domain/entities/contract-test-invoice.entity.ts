import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type ContractTestInvoiceStatus =
  'draft' | 'issued' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export class ContractTestInvoice extends BaseEntity {
  declare id: string;
  declare invoiceNumber: string;
  declare contractId: string;
  declare testingScheduleId: string | null;
  declare billingPeriodStart: Date;
  declare billingPeriodEnd: Date;
  declare totalSamples: number;
  declare baseAmount: number;
  declare taxPercent: number;
  declare taxAmount: number;
  declare totalAmount: number;
  // How much of the contract's initial_fee was applied as credit to this
  // invoice. Always 0 when the contract's remaining initial_fee credit is
  // exhausted.
  declare initialFeeApplied: number;
  // What the customer owes after the initial_fee credit:
  // amount_due = total_amount - initial_fee_applied
  declare amountDue: number;
  declare status: ContractTestInvoiceStatus;
  declare dueDate: Date | null;
  declare issuedAt: Date | null;
  declare paidAt: Date | null;
  declare paidAmount: number | null;
  declare invoiceDocumentUrl: string | null;
  declare paymentProofUrl: string | null;
  declare paymentProofFilename: string | null;
  declare paymentProofUploadedAt: Date | null;
  declare paymentVerifiedAt: Date | null;
  declare paymentVerifiedBy: string | null;
  declare paymentVerifiedByName: string | null;
  declare notes: string | null;
  // Per-test-result line items (filled by the repository).
  declare lines: ContractTestInvoiceLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<ContractTestInvoice> & {
      invoiceNumber: string;
      contractId: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class ContractTestInvoiceLine extends BaseEntity {
  declare id: string;
  declare invoiceId: string;
  declare testResultId: string;
  declare serviceName: string | null;
  declare sampleCode: string | null;
  declare unitPrice: number;
  declare quantity: number;
  declare totalPrice: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<ContractTestInvoiceLine> & {
      invoiceId: string;
      testResultId: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
