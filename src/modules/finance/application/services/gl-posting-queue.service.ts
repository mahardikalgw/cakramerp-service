import { GlPostingQueueServicePort } from '../ports/gl-posting-queue-service.port'
import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import {
  GL_POSTING_QUEUE_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port'
import type {
  GlPostingQueueRepositoryPort,
  JournalEntryRepositoryPort,
  JournalEntryLineRepositoryPort,
} from '../../domain/repositories/finance-repository.port'
import { GlPostingQueue } from '../../domain/entities/gl-posting-queue.entity'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity'
import { DataSource } from 'typeorm'
import { Decimal } from 'decimal.js'
import { PostGlToJournalCommand } from '../commands/post-gl-to-journal.command'

export interface GlPostingQueueResponse {
  id: string
  sourceType: string
  sourceId: string
  sourceNumber: string
  eventType: string
  amount: number
  description: string
  suggestedLines: Record<string, unknown>[]
  status: string
  journalEntryId: string | null
  journalEntryNumber: string | null
  createdAt: string
  postedBy: string | null
  postedByName: string | null
  postedAt: string | null
}

@Injectable()
export class GlPostingQueueService implements GlPostingQueueServicePort {
  constructor(
    @Inject(GL_POSTING_QUEUE_REPOSITORY)
    private readonly repo: GlPostingQueueRepositoryPort,
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepo: JournalEntryRepositoryPort,
    @Inject(JOURNAL_ENTRY_LINE_REPOSITORY)
    private readonly journalLineRepo: JournalEntryLineRepositoryPort,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: {
    status?: string
    sourceType?: string
    page?: number
    limit?: number
  }): Promise<{ data: GlPostingQueueResponse[]; total: number }> {
    const result = await this.repo.findAll(filters)
    const data = await Promise.all(result.data.map((item) => this.toResponse(item)))
    return { data, total: result.total }
  }

  async findById(id: string): Promise<GlPostingQueueResponse | null> {
    const item = await this.repo.findById(id)
    if (!item) return null
    return this.toResponse(item)
  }

  async createEntry(item: {
    sourceType: string
    sourceId: string
    sourceNumber: string
    eventType: string
    amount: number
    description: string
    suggestedLines: Record<string, unknown>[]
  }): Promise<GlPostingQueue> {
    return this.repo.save(
      new GlPostingQueue({
        sourceType: item.sourceType as any,
        sourceId: item.sourceId,
        sourceNumber: item.sourceNumber,
        eventType: item.eventType as any,
        amount: item.amount,
        description: item.description,
        suggestedLines: item.suggestedLines as any[],
      }),
    )
  }

  async postToJournal(
    id: string,
    command: PostGlToJournalCommand,
    userId: string,
  ): Promise<{ journalEntryId: string; journalEntryNumber: string }> {
    const queueItem = await this.repo.findById(id)
    if (!queueItem) throw new BadRequestException('Queue item not found')
    if (queueItem.status !== 'pending') {
      throw new BadRequestException('Only pending items can be posted')
    }

    const entryNumber = await this.journalEntryRepo.getNextEntryNumber()

    const entry = new JournalEntry({
      entryNumber,
      date: new Date(command.date),
      description: command.description,
      reference: `${queueItem.sourceType === 'sales_invoice' ? 'Sales Invoice' : 'Supplier Invoice'} ${queueItem.sourceNumber}`,
      status: 'pending_approval',
      createdBy: userId,
      sourceType: queueItem.sourceType as any,
      sourceId: queueItem.sourceId,
    })

    const savedEntry = await this.journalEntryRepo.save(entry)

    for (const line of command.lines) {
      await this.journalLineRepo.save(
        new JournalEntryLine({
          journalEntryId: savedEntry.id,
          accountId: line.accountId,
          debit: new Decimal(line.debit),
          credit: new Decimal(line.credit),
          description: line.description,
        }),
      )
    }

    await this.repo.update(id, {
      status: 'posted',
      journalEntryId: savedEntry.id,
      postedBy: userId,
      postedAt: new Date(),
      suggestedLines: command.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? '',
      })) as Record<string, unknown>[],
    })

    if (queueItem.sourceType === 'sales_invoice') {
      await this.dataSource.query(
        `UPDATE "ar_invoices" SET "journal_entry_id" = $1 WHERE "id" = $2`,
        [savedEntry.id, queueItem.sourceId],
      )
    } else if (queueItem.sourceType === 'supplier_invoice') {
      await this.dataSource.query(
        `UPDATE "ap_invoices" SET "journal_entry_id" = $1 WHERE "id" = $2`,
        [savedEntry.id, queueItem.sourceId],
      )
    }

    return { journalEntryId: savedEntry.id, journalEntryNumber: entryNumber }
  }

  async cancel(id: string): Promise<void> {
    const queueItem = await this.repo.findById(id)
    if (!queueItem) throw new BadRequestException('Queue item not found')
    if (queueItem.status !== 'pending') {
      throw new BadRequestException('Only pending items can be cancelled')
    }
    await this.repo.update(id, { status: 'cancelled' })
  }

  private async toResponse(item: GlPostingQueue): Promise<GlPostingQueueResponse> {
    let journalEntryNumber: string | null = null
    if (item.journalEntryId) {
      const rows = await this.dataSource.query(
        `SELECT entry_number FROM journal_entries WHERE id = $1 LIMIT 1`,
        [item.journalEntryId],
      )
      if (rows.length > 0) {
        journalEntryNumber = rows[0].entry_number
      }
    }

    let postedByName: string | null = null
    if (item.postedBy) {
      try {
        const rows = await this.dataSource.query(
          `SELECT first_name, last_name FROM users WHERE id = $1 LIMIT 1`,
          [item.postedBy],
        )
        if (rows.length > 0) {
          postedByName = `${rows[0].first_name} ${rows[0].last_name}`.trim()
        }
      } catch {}
    }

    return {
      id: item.id,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceNumber: item.sourceNumber,
      eventType: item.eventType,
      amount: item.amount,
      description: item.description,
      suggestedLines: (item.suggestedLines ?? []) as Record<string, unknown>[],
      status: item.status,
      journalEntryId: item.journalEntryId ?? null,
      journalEntryNumber,
      createdAt: item.createdAt.toISOString(),
      postedBy: item.postedBy ?? null,
      postedByName,
      postedAt: item.postedAt?.toISOString() ?? null,
    }
  }
}