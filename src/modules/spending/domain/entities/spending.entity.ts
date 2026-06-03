import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Spending extends BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  spendingNumber: string;
  expenseCategory: string;
  amount: number;
  spendingDate: Date;
  description: string | null;
  vendor: string | null;
  referenceNo: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  glPostingQueueId?: string;
  journalEntryId?: string;

  constructor(
    props: Partial<Spending> & {
      spendingNumber: string;
      expenseCategory: string;
      amount: number;
      spendingDate: Date;
      status: Spending['status'];
      paymentMethod: Spending['paymentMethod'];
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
