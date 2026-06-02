import { Account } from '../../domain/entities/account.entity';
import type { AccountTreeNode } from '../services/account.service';
import type { CreateAccountCommand } from '../commands/create-account.command';
import type { UpdateAccountCommand } from '../commands/update-account.command';

export const ACCOUNT_SERVICE = Symbol('ACCOUNT_SERVICE');

export interface AccountServicePort {
  getAccountTree(): Promise<AccountTreeNode[]>;
  getActiveAccounts(): Promise<Account[]>;
  createAccount(command: CreateAccountCommand): Promise<Account>;
  updateAccount(id: string, command: UpdateAccountCommand): Promise<Account>;
  deactivateAccount(id: string): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
}
