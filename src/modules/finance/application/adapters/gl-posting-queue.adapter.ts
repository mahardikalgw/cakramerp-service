import { Injectable, Inject } from '@nestjs/common';
import { GL_POSTING_QUEUE_PORT, GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import { GL_POSTING_QUEUE_SERVICE } from '../ports/gl-posting-queue-service.port';
import type { GlPostingQueueServicePort } from '../ports/gl-posting-queue-service.port';

/**
 * GL Posting Queue adapter that implements the shared kernel port.
 * This is the only place that exposes GL posting functionality to other modules.
 */
@Injectable()
export class GlPostingQueueAdapter implements GlPostingQueuePort {
  constructor(
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
  ) {}

  async createEntry(item: {
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
  }): Promise<{ id: string }> {
    const entry = await this.glPostingQueueService.createEntry({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceNumber: item.sourceNumber,
      eventType: item.eventType,
      amount: item.amount,
      description: item.description,
      suggestedLines: item.suggestedLines,
    });
    return { id: entry.id };
  }
}