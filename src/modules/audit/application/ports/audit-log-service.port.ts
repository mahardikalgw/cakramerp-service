import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { CreateAuditLogCommand } from '../commands/create-audit-log.command';

export const AUDIT_LOG_SERVICE = Symbol('AUDIT_LOG_SERVICE');

export interface AuditLogServicePort {
  create(command: CreateAuditLogCommand): Promise<AuditLog>;
  findAll(options?: any): Promise<FindResult<AuditLog>>;
  findByUserId(userId: string, options?: any): Promise<FindResult<AuditLog>>;
  findByModule(module: string, options?: any): Promise<FindResult<AuditLog>>;
  findByAction(action: string, options?: any): Promise<FindResult<AuditLog>>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: any,
  ): Promise<FindResult<AuditLog>>;
  exportToExcel(filters?: any): Promise<Buffer>;
  exportToPdf(filters?: any): Promise<Buffer>;
}
