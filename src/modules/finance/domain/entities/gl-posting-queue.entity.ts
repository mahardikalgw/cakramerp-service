export type GlPostingQueueStatus = 'pending' | 'posted' | 'cancelled'
export type GlPostingSourceType = 'sales_invoice' | 'supplier_invoice' | 'asset_depreciation' | 'payroll' | 'spending'
export type GlPostingEventType = 'invoice_issued' | 'payment_received' | 'payment_made' | 'invoice_recorded' | 'depreciation' | 'payroll_run' | 'spending_recorded'

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
  customerId?: string
  supplierId?: string
  invoiceId?: string
  billingLetterId?: string
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