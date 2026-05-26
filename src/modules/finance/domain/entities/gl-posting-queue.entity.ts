export type GlPostingQueueStatus = 'pending' | 'posted' | 'cancelled'
export type GlPostingSourceType = 'sales_invoice' | 'supplier_invoice'
export type GlPostingEventType = 'invoice_issued' | 'payment_received' | 'payment_made' | 'invoice_recorded'

export interface SuggestedLine {
  accountId: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description: string
}

export class GlPostingQueue {
  id: string
  sourceType: GlPostingSourceType
  sourceId: string
  sourceNumber: string
  eventType: GlPostingEventType
  amount: number
  description: string
  suggestedLines: Record<string, unknown>[]
  status: GlPostingQueueStatus
  journalEntryId?: string
  postedBy?: string
  postedAt?: Date
  createdAt: Date
  updatedAt: Date

  constructor(props: Partial<GlPostingQueue> & { sourceType: GlPostingSourceType; sourceId: string; sourceNumber: string; eventType: GlPostingEventType; amount: number; description: string }) {
    Object.assign(this, props)
    this.status = props.status ?? 'pending'
    this.suggestedLines = props.suggestedLines ?? []
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }
}