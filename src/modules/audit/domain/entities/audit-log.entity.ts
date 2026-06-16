import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  ROLE_CHANGE = 'role_change',
  DATA_EXPORT = 'data_export',
  ADMIN_ACTION = 'admin_action',
}

export class AuditLog extends BaseEntity {
  declare id: string;
  declare userId: string;
  declare userName: string;
  declare action: AuditAction;
  declare module: string;
  declare recordId: string;
  declare ipAddress: string;
  declare payload?: any;
  declare timestamp: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

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
