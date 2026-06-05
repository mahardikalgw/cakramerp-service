import { AccountServicePort } from '../ports/account-service.port';
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import type {
  AccountRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port';
import { Account } from '../../domain/entities/account.entity';
import type { AccountType } from '../../domain/entities/account.entity';
import { CreateAccountCommand } from '../commands/create-account.command';
import { UpdateAccountCommand } from '../commands/update-account.command';

export interface AccountTreeNode {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxCategory?: string;
  segment?: string;
  costCenter?: string;
  parentId?: string;
  isActive: boolean;
  children: AccountTreeNode[];
}

@Injectable()
export class AccountService implements AccountServicePort {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
  ) {}

  async getAccountTree(): Promise<AccountTreeNode[]> {
    const accounts = await this.accountRepo.findAllFlat();
    return this.buildTree(accounts);
  }

  async getActiveAccounts(): Promise<Account[]> {
    return this.accountRepo.findActive();
  }

  async createAccount(command: CreateAccountCommand): Promise<Account> {
    const existing = await this.accountRepo.findByCode(command.code);
    if (existing) {
      throw new BadRequestException(
        `Account code "${command.code}" already exists`,
      );
    }

    if (command.parentId) {
      const parent = await this.accountRepo.findById(command.parentId);
      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }
    }

    const account = new Account({
      code: command.code,
      name: command.name,
      type: command.type,
      taxCategory: command.taxCategory,
      segment: command.segment,
      costCenter: command.costCenter,
      parentId: command.parentId,
      isActive: true,
    });

    return this.accountRepo.save(account);
  }

  async updateAccount(
    id: string,
    command: UpdateAccountCommand,
  ): Promise<Account> {
    const account = await this.accountRepo.findById(id);
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    if (command.code && command.code !== account.code) {
      const existing = await this.accountRepo.findByCode(command.code);
      if (existing) {
        throw new BadRequestException(
          `Account code "${command.code}" already exists`,
        );
      }
    }

    if (command.parentId && command.parentId !== account.parentId) {
      if (command.parentId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }
      const parent = await this.accountRepo.findById(command.parentId);
      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }
    }

    if (command.code) account.code = command.code;
    if (command.name) account.name = command.name;
    if (command.type) account.type = command.type;
    if (command.taxCategory !== undefined)
      account.taxCategory = command.taxCategory;
    if (command.segment !== undefined) account.segment = command.segment;
    if (command.costCenter !== undefined)
      account.costCenter = command.costCenter;
    if (command.parentId !== undefined) account.parentId = command.parentId;
    account.updatedAt = new Date();

    return this.accountRepo.save(account);
  }

  async deactivateAccount(id: string): Promise<Account> {
    const account = await this.accountRepo.findById(id);
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      [id],
      startOfMonth,
      now,
    );
    if (lines.length > 0) {
      throw new BadRequestException(
        'Cannot deactivate account with transactions in the current open period',
      );
    }

    account.isActive = false;
    account.updatedAt = new Date();
    return this.accountRepo.save(account);
  }

  async deleteAccount(id: string): Promise<void> {
    const account = await this.accountRepo.findById(id);
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    const lines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      [id],
      new Date('2000-01-01'),
      new Date(),
    );
    if (lines.length > 0) {
      throw new BadRequestException(
        'Cannot delete account that has journal entry lines. Deactivate it instead.',
      );
    }

    await this.accountRepo.delete(id);
  }

  private buildTree(accounts: Account[]): AccountTreeNode[] {
    const map = new Map<string, AccountTreeNode>();
    const roots: AccountTreeNode[] = [];

    for (const acc of accounts) {
      map.set(acc.id, {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        taxCategory: acc.taxCategory,
        segment: acc.segment,
        costCenter: acc.costCenter,
        parentId: acc.parentId,
        isActive: acc.isActive,
        children: [],
      });
    }

    for (const acc of accounts) {
      const node = map.get(acc.id);
      if (!node) continue;
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const typeOrder: Record<string, number> = {
      asset: 1,
      liability: 2,
      equity: 3,
      revenue: 4,
      expense: 5,
    };
    roots.sort(
      (a, b) =>
        (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99) ||
        a.code.localeCompare(b.code),
    );

    return roots;
  }
}
