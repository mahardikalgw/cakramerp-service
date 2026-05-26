export const GL_POSTING_QUEUE_SERVICE = Symbol('GL_POSTING_QUEUE_SERVICE')

export interface GlPostingQueueServicePort {
  findAll(filters?: {
    status?: string
    sourceType?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any | null>
  createEntry(item: {
    sourceType: string
    sourceId: string
    sourceNumber: string
    eventType: string
    amount: number
    description: string
    suggestedLines: Record<string, unknown>[]
  }): Promise<any>
  postToJournal(id: string, dto: any, userId: string): Promise<{ journalEntryId: string; journalEntryNumber: string }>
  cancel(id: string): Promise<void>
}