import { Inject, Injectable } from '@nestjs/common';
import { AuditLog, AuditAction } from '../../domain/entities/audit-log.entity';
import type { AuditLogRepositoryPort } from '../../domain/repositories/audit-log-repository.port';
import { AUDIT_LOG_REPOSITORY } from '../../domain/repositories/audit-log-repository.port';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { CreateAuditLogCommand } from '../commands/create-audit-log.command';
import { AuditLogServicePort } from '../ports/audit-log-service.port';

@Injectable()
export class AuditLogService implements AuditLogServicePort {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepositoryPort,
  ) {}

  async create(command: CreateAuditLogCommand): Promise<AuditLog> {
    const auditLog = new AuditLog({
      userId: command.userId,
      userName: command.userName,
      action: command.action as AuditAction,
      module: command.module,
      recordId: command.recordId,
      ipAddress: command.ipAddress,
      payload: command.payload,
    });
    return this.auditLogRepository.save(auditLog);
  }

  async findAll(options?: any): Promise<FindResult<AuditLog>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.auditLogRepository.findAll(options);
  }

  async findByUserId(
    userId: string,
    options?: any,
  ): Promise<FindResult<AuditLog>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.auditLogRepository.findByUserId(userId, options);
  }

  async findByModule(
    module: string,
    options?: any,
  ): Promise<FindResult<AuditLog>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.auditLogRepository.findByModule(module, options);
  }

  async findByAction(
    action: string,
    options?: any,
  ): Promise<FindResult<AuditLog>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.auditLogRepository.findByAction(action, options);
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: any,
  ): Promise<FindResult<AuditLog>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.auditLogRepository.findByDateRange(startDate, endDate, options);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exportToExcel(filters?: any): Promise<Buffer> {
    // TODO: Implement Excel export using exceljs
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    throw new Error('Excel export not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exportToPdf(filters?: any): Promise<Buffer> {
    // TODO: Implement PDF export using pdfkit
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    throw new Error('PDF export not implemented yet');
  }
}
