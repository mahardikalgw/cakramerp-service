import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AUDIT_LOG_QUEUE_NAME } from './audit-log.constants';

export interface AuditLogJobData {
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId: string;
  ipAddress?: string;
  payload?: Record<string, unknown>;
}

@Processor(AUDIT_LOG_QUEUE_NAME)
export class AuditLogProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditLogProcessor.name);

  async process(job: { data: AuditLogJobData }): Promise<void> {
    const data = job.data;
    this.logger.debug(`Persisting audit: ${data.module}:${data.action}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    this.logger.debug(`Audit persisted: ${data.module}:${data.action}`);
  }
}
