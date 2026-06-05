import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Spending extends BaseEntity {
  declare id: string;
  declare spendingNumber: string;
  declare expenseCategory: string;
  declare amount: number;
  declare spendingDate: Date;
  declare description: string | null;
  declare vendor: string | null;
  declare referenceNo: string | null;
  declare status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  declare paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  declare glPostingQueueId?: string;
  declare journalEntryId?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

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
