import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum BackupJobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RUNNING = 'running',
}

export class BackupJob extends BaseEntity {
  declare id: string;
  declare name: string;
  declare schedule: string;
  declare status: BackupJobStatus;
  declare lastRun: Date | null;
  declare nextRun: Date | null;
  declare lastSize: string | null;
  declare retentionDays: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(props: Partial<BackupJob> & { name: string; schedule: string }) {
    super();
    Object.assign(this, props);
    this.status = props.status || BackupJobStatus.ACTIVE;
    this.lastRun = props.lastRun || null;
    this.nextRun = props.nextRun || null;
    this.lastSize = props.lastSize || null;
    this.retentionDays = props.retentionDays || null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
