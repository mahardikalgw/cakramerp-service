import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

export enum AuditActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
}

@Entity('audit_logs')
export class AuditLogTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  userName: string;

  @Column({
    type: 'enum',
    enum: AuditActionType,
  })
  @Index()
  action: AuditActionType;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  module: string;

  @Column({ type: 'varchar', length: 255 })
  recordId: string;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;
}
