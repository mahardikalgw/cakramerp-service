import { JournalEntryServicePort } from '../ports/journal-entry-service.port'
import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Decimal } from 'decimal.js'
import {
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
  ACCOUNT_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
  AccountRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity'

export interface CreateJournalEntryDto {
  date: string
  description: string
  reference?: string
  segment?: string
  projectId?: string
  costCenter?: string
  lines: {
    accountId: string
    debit: number
    credit: number
    description?: string
  }[]
}

export interface JournalEntryWithLines {
  entry: JournalEntry
  lines: any[]
  totalDebit: number
  totalCredit: number
}

@Injectable()
export class JournalEntryService implements JournalEntryServicePort {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepo: AccountRepositoryPort,
  ) {}

  async findAll(filters?: {
    dateFrom?: string
    dateTo?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: JournalEntryWithLines[]; total: number }> {
    const { data: entries, total } = await this.journalEntryRepo.findAll({
      dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
      status: filters?.status,
      page: filters?.page,
      limit: filters?.limit,
    })

    const result: JournalEntryWithLines[] = []
    for (const entry of entries) {
      const lines = await this.journalLineRepo.findByJournalEntryId(entry.id)
      const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0)
      const totalCredit = lines.reduce((sum, l) => sum + l.credit.toNumber(), 0)
      result.push({ entry, lines, totalDebit, totalCredit })
    }

    return { data: result, total }
  }

  async findById(id: string): Promise<JournalEntryWithLines | null> {
    const entry = await this.journalEntryRepo.findById(id)
    if (!entry) return null

    const lines = await this.journalLineRepo.findByJournalEntryId(id)
    const enrichedLines = await this.enrichLinesWithAccounts(lines)
    const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0)
    const totalCredit = lines.reduce((sum, l) => sum + l.credit.toNumber(), 0)

    return { entry, lines: enrichedLines, totalDebit, totalCredit }
  }

  async create(dto: CreateJournalEntryDto, userId: string, asDraft = true): Promise<JournalEntryWithLines> {
    // Validate debit === credit
    const totalDebit = dto.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = dto.lines.reduce((sum, l) => sum + l.credit, 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      )
    }

    if (dto.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines')
    }

    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()

    const entry = new JournalEntry({
      entryNumber,
      date: new Date(dto.date),
      description: dto.description,
      reference: dto.reference,
      segment: dto.segment,
      projectId: dto.projectId,
      costCenter: dto.costCenter,
      status: asDraft ? 'draft' : 'pending_approval',
      createdBy: userId,
    })

    const savedEntry = await this.journalEntryRepo.save(entry)

    const lines: JournalEntryLine[] = []
    for (const line of dto.lines) {
      const jeLine = new JournalEntryLine({
        journalEntryId: savedEntry.id,
        accountId: line.accountId,
        debit: new Decimal(line.debit),
        credit: new Decimal(line.credit),
        description: line.description,
      })
      const savedLine = await this.journalLineRepo.save(jeLine)
      lines.push(savedLine)
    }

    return { entry: savedEntry, lines, totalDebit, totalCredit }
  }

  async submit(id: string, userId: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepo.findById(id)
    if (!entry) throw new BadRequestException('Journal entry not found')
    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft entries can be submitted for approval')
    }

    entry.status = 'pending_approval'
    entry.updatedAt = new Date()
    return this.journalEntryRepo.save(entry)
  }

  async approve(id: string, userId: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepo.findById(id)
    if (!entry) throw new BadRequestException('Journal entry not found')
    if (entry.status !== 'pending_approval') {
      throw new BadRequestException('Only pending entries can be approved')
    }

    entry.status = 'approved'
    entry.approvedBy = userId
    entry.approvedAt = new Date()
    entry.updatedAt = new Date()
    return this.journalEntryRepo.save(entry)
  }

  async reverse(id: string, userId: string): Promise<JournalEntryWithLines> {
    const original = await this.findById(id)
    if (!original) throw new BadRequestException('Journal entry not found')
    if (original.entry.status !== 'approved') {
      throw new BadRequestException('Only approved entries can be reversed')
    }

    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()

    // Create reversal entry with swapped debits/credits
    const reversalEntry = new JournalEntry({
      entryNumber,
      date: new Date(),
      description: `Reversal of ${original.entry.entryNumber}: ${original.entry.description}`,
      reference: original.entry.reference,
      segment: original.entry.segment,
      projectId: original.entry.projectId,
      costCenter: original.entry.costCenter,
      status: 'approved',
      createdBy: userId,
      approvedBy: userId,
      approvedAt: new Date(),
      reversalOfId: id,
    })

    const savedReversal = await this.journalEntryRepo.save(reversalEntry)

    const lines: JournalEntryLine[] = []
    for (const line of original.lines) {
      const reversalLine = new JournalEntryLine({
        journalEntryId: savedReversal.id,
        accountId: line.accountId,
        debit: new Decimal(line.credit),
        credit: new Decimal(line.debit),
        description: `Reversal: ${line.description ?? ''}`,
      })
      const savedLine = await this.journalLineRepo.save(reversalLine)
      lines.push(savedLine)
    }

    // Mark original as reversed
    original.entry.status = 'reversed'
    original.entry.updatedAt = new Date()
    await this.journalEntryRepo.save(original.entry)

    const totalDebit = lines.reduce((sum, l) => sum + l.debit.toNumber(), 0)
    const totalCredit = lines.reduce((sum, l) => sum + l.credit.toNumber(), 0)

    return { entry: savedReversal, lines, totalDebit, totalCredit }
  }

  private async enrichLinesWithAccounts(lines: JournalEntryLine[]): Promise<any[]> {
    const accountIds = [...new Set(lines.map((l) => l.accountId))]
    const accountMap = new Map<string, { code: string; name: string }>()

    for (const accountId of accountIds) {
      const account = await this.accountRepo.findById(accountId)
      if (account) {
        accountMap.set(accountId, { code: account.code, name: account.name })
      }
    }

    return lines.map((line) => {
      const account = accountMap.get(line.accountId)
      return {
        id: line.id,
        journalEntryId: line.journalEntryId,
        accountId: line.accountId,
        accountCode: account?.code ?? '',
        accountName: account?.name ?? '',
        debit: line.debit.toNumber(),
        credit: line.credit.toNumber(),
        description: line.description ?? '',
        createdAt: line.createdAt,
      }
    })
  }
}
