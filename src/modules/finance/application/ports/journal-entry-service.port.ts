import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import type { JournalEntryWithLines } from '../services/journal-entry.service'
import type { CreateJournalEntryCommand } from '../commands/create-journal-entry.command'

export const JOURNAL_ENTRY_SERVICE = Symbol('JOURNAL_ENTRY_SERVICE')

export interface JournalEntryServicePort {
  findAll(filters?: {
    dateFrom?: string
    dateTo?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: JournalEntryWithLines[]; total: number }>
  findById(id: string): Promise<JournalEntryWithLines | null>
  create(command: CreateJournalEntryCommand, userId: string, asDraft?: boolean): Promise<JournalEntryWithLines>
  submit(id: string, userId: string): Promise<JournalEntry>
  approve(id: string, userId: string): Promise<JournalEntry>
  reverse(id: string, userId: string): Promise<JournalEntryWithLines>
}