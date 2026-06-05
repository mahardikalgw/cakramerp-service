export const GL_POSTING_QUEUE_PORT = Symbol('GL_POSTING_QUEUE_PORT');

export interface GlPostingQueuePort {
  createEntry(item: {
    sourceType: string;
    sourceId: string;
    sourceNumber: string;
    eventType: string;
    amount: number;
    description: string;
    suggestedLines: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      description: string;
    }>;
  }): Promise<{ id: string }>;
}
