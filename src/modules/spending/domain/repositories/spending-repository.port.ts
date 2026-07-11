import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Spending } from '../entities/spending.entity';

export const SPENDING_REPOSITORY = Symbol('SPENDING_REPOSITORY');

export interface SpendingRepositoryPort extends RepositoryPort<Spending> {
  findBySpendingNumber(spendingNumber: string): Promise<Spending | null>;
  getLastSpendingNumber(prefix: string): Promise<string | null>;
  generateNextSpendingNumber(): Promise<string>;
}
