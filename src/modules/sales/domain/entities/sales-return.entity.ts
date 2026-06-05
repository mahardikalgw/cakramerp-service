import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';
import { SalesReturnLine } from './sales-return-line.entity';

export class SalesReturn extends BaseEntity {
  declare id: string;
  declare returnNumber: string;
  declare salesOrderId: string | null;
  declare customerId: string;
  declare customerName: string;
  declare returnDate: Date;
  declare status: 'draft' | 'approved' | 'rejected';
  declare totalAmount: number;
  declare reason: string | null;
  declare approvedBy: string | null;
  declare approvedAt: Date | null;
  declare rejectionReason: string | null;
  declare glPostingQueueId: string | null;
  declare journalEntryId: string | null;
  declare lines: SalesReturnLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<SalesReturn> & {
      returnNumber: string;
      customerId: string;
      customerName: string;
      returnDate: Date;
      status: SalesReturn['status'];
      totalAmount: number;
      lines: SalesReturnLine[];
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
