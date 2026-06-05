export const SPENDING_SERVICE = Symbol('SPENDING_SERVICE');

export interface SpendingServicePort {
  createSpending(command: {
    expenseCategory: string;
    amount: number;
    spendingDate: string;
    description?: string;
    vendor?: string;
    referenceNo?: string;
    paymentMethod: string;
  }): Promise<any>;
  findSpendingById(id: string): Promise<any | null>;
  findSpendings(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    data: any[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  approve(id: string): Promise<any>;
  reject(id: string): Promise<any>;
}
