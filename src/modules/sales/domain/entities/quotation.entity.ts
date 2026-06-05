import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';
import { QuotationLine } from './quotation-line.entity';

export class Quotation extends BaseEntity {
  declare id: string;
  declare quotationNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare quotationDate: Date;
  declare validUntil: Date | null;
  declare status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  declare totalAmount: number;
  declare discountAmount: number;
  declare taxAmount: number;
  declare grandTotal: number;
  declare notes: string | null;
  declare lines: QuotationLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<Quotation> & {
      quotationNumber: string;
      customerId: string;
      customerName: string;
      quotationDate: Date;
      status: Quotation['status'];
      totalAmount: number;
      grandTotal: number;
      lines: QuotationLine[];
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
