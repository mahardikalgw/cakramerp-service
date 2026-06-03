import { AuditLog } from '../../../domain/entities/audit-log.entity';

export class AuditLogResponseDto {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId: string;
  ipAddress: string;
  payload?: any;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(auditLog: AuditLog): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = auditLog.id;
    dto.userId = auditLog.userId;
    dto.userName = auditLog.userName;
    dto.action = auditLog.action;
    dto.module = auditLog.module;
    dto.recordId = auditLog.recordId;
    dto.ipAddress = auditLog.ipAddress;

    dto.payload = auditLog.payload;
    dto.timestamp = auditLog.timestamp;
    dto.createdAt = auditLog.createdAt;
    dto.updatedAt = auditLog.updatedAt;
    return dto;
  }
}
