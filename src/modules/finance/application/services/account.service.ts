import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import {
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  AccountRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { Account, AccountType } from '../../domain/entities/account.entity'

export interface AccountTreeNode {
  id: string
  code: string
  name: string
  type: AccountType
  taxCategory?: string
  segment?: string
  costCenter?: string
  parentId?: string
  isActive: boolean
  children: AccountTreeNode[]
}

export interface CreateAccountDto {
  code: string
  name: string
  type: AccountType
  taxCategory?: string
  segment?: string
  costCenter?: string
  parentId?: string
}

export interface UpdateAccountDto {
  code?: string
  name?: string
  type?: AccountType
  taxCategory?: string
  segment?: string
  costCenter?: string
  parentId?: string
}

@Injectable()
export class AccountService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
  ) {}

  async getAccountTree(): Promise<AccountTreeNode[]> {
    const accounts = await this.accountRepo.findAllFlat()
    return this.buildTree(accounts)
  }

  async getActiveAccounts(): Promise<Account[]> {
    return this.accountRepo.findActive()
  }

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    // Validate unique code
    const existing = await this.accountRepo.findByCode(dto.code)
    if (existing) {
      throw new BadRequestException(`Account code "${dto.code}" already exists`)
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.accountRepo.findById(dto.parentId)
      if (!parent) {
        throw new BadRequestException('Parent account not found')
      }
    }

    const account = new Account({
      code: dto.code,
      name: dto.name,
      type: dto.type,
      taxCategory: dto.taxCategory,
      segment: dto.segment,
      costCenter: dto.costCenter,
      parentId: dto.parentId,
      isActive: true,
    })

    return this.accountRepo.save(account)
  }

  async updateAccount(id: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.accountRepo.findById(id)
    if (!account) {
      throw new BadRequestException('Account not found')
    }

    // Validate unique code if changing
    if (dto.code && dto.code !== account.code) {
      const existing = await this.accountRepo.findByCode(dto.code)
      if (existing) {
        throw new BadRequestException(`Account code "${dto.code}" already exists`)
      }
    }

    // Validate parent if changing
    if (dto.parentId && dto.parentId !== account.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Account cannot be its own parent')
      }
      const parent = await this.accountRepo.findById(dto.parentId)
      if (!parent) {
        throw new BadRequestException('Parent account not found')
      }
    }

    if (dto.code) account.code = dto.code
    if (dto.name) account.name = dto.name
    if (dto.type) account.type = dto.type
    if (dto.taxCategory !== undefined) account.taxCategory = dto.taxCategory
    if (dto.segment !== undefined) account.segment = dto.segment
    if (dto.costCenter !== undefined) account.costCenter = dto.costCenter
    if (dto.parentId !== undefined) account.parentId = dto.parentId
    account.updatedAt = new Date()

    return this.accountRepo.save(account)
  }

  async deactivateAccount(id: string): Promise<Account> {
    const account = await this.accountRepo.findById(id)
    if (!account) {
      throw new BadRequestException('Account not found')
    }

    // Block deactivation if account has transactions in current open period
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      [id],
      startOfMonth,
      now,
    )
    if (lines.length > 0) {
      throw new BadRequestException(
        'Cannot deactivate account with transactions in the current open period',
      )
    }

    account.isActive = false
    account.updatedAt = new Date()
    return this.accountRepo.save(account)
  }

  async deleteAccount(id: string): Promise<void> {
    const account = await this.accountRepo.findById(id)
    if (!account) {
      throw new BadRequestException('Account not found')
    }

    // Block deletion if account has any journal entry lines
    const lines = await this.journalLineRepo.findByAccountIdsAndDateRange(
      [id],
      new Date('2000-01-01'),
      new Date(),
    )
    if (lines.length > 0) {
      throw new BadRequestException(
        'Cannot delete account that has journal entry lines. Deactivate it instead.',
      )
    }

    await this.accountRepo.delete(id)
  }

  private buildTree(accounts: Account[]): AccountTreeNode[] {
    const map = new Map<string, AccountTreeNode>()
    const roots: AccountTreeNode[] = []

    // Create nodes
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
      })
    }

    // Build hierarchy
    for (const acc of accounts) {
      const node = map.get(acc.id)!
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    // Sort by type order then code
    const typeOrder: Record<string, number> = {
      asset: 1,
      liability: 2,
      equity: 3,
      revenue: 4,
      expense: 5,
    }
    roots.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99) || a.code.localeCompare(b.code))

    return roots
  }
}
