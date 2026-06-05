import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';
import { SalesOrderLine } from './sales-order-line.entity';

export class SalesOrder extends BaseEntity {
  declare id: string;
  declare soNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare quotationId: string | null;
  declare orderDate: Date;
  declare expectedDeliveryDate: Date | null;
  declare status:
    | 'draft'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'fully_delivered'
    | 'invoiced';
  declare totalAmount: number;
  declare discountAmount: number;
  declare taxAmount: number;
  declare grandTotal: number;
  declare paymentTermDays: number;
  declare paymentTermLabel: string | null;
  declare notes: string | null;
  declare approvedBy: string | null;
  declare approvedAt: Date | null;
  declare rejectionReason: string | null;
  declare glPostingQueueId: string | null;
  declare journalEntryId: string | null;
  declare lines: SalesOrderLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<SalesOrder> & {
      soNumber: string;
      customerId: string;
      customerName: string;
      orderDate: Date;
      status: SalesOrder['status'];
      totalAmount: number;
      grandTotal: number;
      lines: SalesOrderLine[];
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
