import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { GL_POSTING_QUEUE_NAME } from './gl-posting.constants';

export interface GlPostingJobData {
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
}

@Processor(GL_POSTING_QUEUE_NAME)
export class GlPostingProcessor extends WorkerHost {
  private readonly logger = new Logger(GlPostingProcessor.name);

  async process(job: { data: GlPostingJobData }): Promise<void> {
    const data = job.data;
    this.logger.debug(
      `Processing GL posting: ${data.sourceType} #${data.sourceNumber}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.logger.debug(
      `GL posting done: ${data.sourceType} #${data.sourceNumber}`,
    );
  }
}
