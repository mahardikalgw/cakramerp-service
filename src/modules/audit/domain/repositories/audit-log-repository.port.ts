import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { AuditLog } from '../entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogRepositoryPort extends RepositoryPort<AuditLog> {
  findByUserId(userId: string, options?: any): Promise<any>;
  findByModule(module: string, options?: any): Promise<any>;
  findByAction(action: string, options?: any): Promise<any>;
  findByDateRange(startDate: Date, endDate: Date, options?: any): Promise<any>;
}
