import type { GlPostingQueueResponse } from '../services/gl-posting-queue.service';
import type { PostGlToJournalCommand } from '../commands/post-gl-to-journal.command';

export const GL_POSTING_QUEUE_SERVICE = Symbol('GL_POSTING_QUEUE_SERVICE');

export interface GlPostingQueueServicePort {
  findAll(filters?: {
    status?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GlPostingQueueResponse[]; total: number }>;
  findById(id: string): Promise<GlPostingQueueResponse | null>;
  createEntry(item: {
    sourceType: string;
    sourceId: string;
    sourceNumber: string;
    eventType: string;
    amount: number;
    description: string;
    suggestedLines: Record<string, unknown>[];
  }): Promise<any>;
  postToJournal(
    id: string,
    command: PostGlToJournalCommand,
    userId: string,
  ): Promise<{ journalEntryId: string; journalEntryNumber: string }>;
  cancel(id: string): Promise<void>;
}
