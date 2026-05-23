import { Account } from '../../domain/entities/account.entity'
import type { AccountTreeNode, CreateAccountDto, UpdateAccountDto } from '../services/account.service'

export const ACCOUNT_SERVICE = Symbol('ACCOUNT_SERVICE')

export interface AccountServicePort {
  getAccountTree(): Promise<AccountTreeNode[]>
  getActiveAccounts(): Promise<Account[]>
  createAccount(dto: CreateAccountDto): Promise<Account>
  updateAccount(id: string, dto: UpdateAccountDto): Promise<Account>
  deactivateAccount(id: string): Promise<Account>
  deleteAccount(id: string): Promise<void>
}
