import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
}

export class AuditLog extends BaseEntity {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  recordId: string;
  ipAddress: string;
  payload?: any;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    props: Partial<AuditLog> & {
      userId: string;
      action: AuditAction;
      module: string;
    },
  ) {
    super();
    Object.assign(this, props);
    this.timestamp = props.timestamp || new Date();
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
