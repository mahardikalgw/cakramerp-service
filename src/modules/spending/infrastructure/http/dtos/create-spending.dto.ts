export interface CreateSpendingDto {
  expenseCategory: string;
  amount: number;
  spendingDate: string;
  description?: string;
  vendor?: string;
  referenceNo?: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
}
