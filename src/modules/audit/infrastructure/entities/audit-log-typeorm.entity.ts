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
  declare userId: string;

  @Column({ type: 'varchar', length: 255 })
  declare userName: string;

  @Column({
    type: 'enum',
    enum: AuditActionType,
  })
  @Index()
  declare action: AuditActionType;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  declare module: string;

  @Column({ type: 'varchar', length: 255 })
  declare recordId: string;

  @Column({ type: 'varchar', length: 45 })
  declare ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  declare payload: any;

  @Column({ type: 'timestamp' })
  @Index()
  declare timestamp: Date;
}
