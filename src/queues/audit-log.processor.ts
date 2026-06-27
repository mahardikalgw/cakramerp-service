import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { AUDIT_LOG_QUEUE_NAME } from './audit-log.constants';
import {
  AuditLog,
  AuditAction,
} from '../modules/audit/domain/entities/audit-log.entity';
import type { AuditLogRepositoryPort } from '../modules/audit/domain/repositories/audit-log-repository.port';
import { AUDIT_LOG_REPOSITORY } from '../modules/audit/domain/repositories/audit-log-repository.port';

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

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepositoryPort,
  ) {
    super();
  }

  async process(job: { data: AuditLogJobData }): Promise<void> {
    const data = job.data;
    this.logger.debug(`Persisting audit: ${data.module}:${data.action}`);

    const auditLog = new AuditLog({
      userId: data.userId,
      userName: data.userName ?? 'system',
      action: data.action as AuditAction,
      module: data.module,
      recordId: data.recordId,
      ipAddress: data.ipAddress,
      payload: data.payload,
    });

    await this.auditLogRepository.save(auditLog);
    this.logger.debug(`Audit persisted: ${data.module}:${data.action}`);
  }
}
