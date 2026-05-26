import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity'
import { Decimal } from 'decimal.js'

export type JournalEntryStatus = 'draft' | 'pending_approval' | 'approved' | 'reversed'

export class JournalEntry extends BaseEntity {
  id: string
  entryNumber: string
  date: Date
  description: string
  reference?: string
  status: JournalEntryStatus
  projectId?: string
  segment?: string
  costCenter?: string
  createdBy: string
  approvedBy?: string
  approvedAt?: Date
  reversalOfId?: string
  sourceType?: string
  sourceId?: string
  createdAt: Date
  updatedAt: Date

  constructor(props: Partial<JournalEntry> & { entryNumber: string; date: Date; description: string; createdBy: string }) {
    super()
    Object.assign(this, props)
    this.status = props.status ?? 'draft'
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }
}
