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

  async exportToExcel(filters?: any): Promise<Buffer> {
    const { data } = await this.findAll(filters);
    const rows = data.map((log) => [
      log.id,
      log.userName,
      log.action,
      log.module,
      log.recordId ?? '',
      log.ipAddress ?? '',
      log.createdAt?.toISOString?.() ?? String(log.createdAt),
    ]);

    const header =
      'ID\tUser\tAction\tModule\tRecord ID\tIP Address\tTimestamp\n';
    const body = rows.map((r) => r.join('\t')).join('\n');
    return Buffer.from(header + body, 'utf-8');
  }

  async exportToPdf(filters?: any): Promise<Buffer> {
    const { data } = await this.findAll(filters);
    const rows = data.map(
      (log) =>
        `${log.userName} | ${log.action} | ${log.module} | ${log.recordId ?? '-'} | ${log.createdAt?.toISOString?.() ?? String(log.createdAt)}`,
    );

    const content = [
      'AUDIT LOG REPORT',
      '='.repeat(60),
      `Generated: ${new Date().toISOString()}`,
      `Total Records: ${data.length}`,
      '',
      'User | Action | Module | Record ID | Timestamp',
      '-'.repeat(60),
      ...rows,
    ].join('\n');

    return Buffer.from(content, 'utf-8');
  }
}
