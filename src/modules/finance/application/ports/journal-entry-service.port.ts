import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import type { CreateJournalEntryDto, JournalEntryWithLines } from '../services/journal-entry.service'

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
  create(dto: CreateJournalEntryDto, userId: string, asDraft?: boolean): Promise<JournalEntryWithLines>
  submit(id: string, userId: string): Promise<JournalEntry>
  approve(id: string, userId: string): Promise<JournalEntry>
  reverse(id: string, userId: string): Promise<JournalEntryWithLines>
}
