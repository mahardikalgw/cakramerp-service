import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum BackupJobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RUNNING = 'running',
}

export class BackupJob extends BaseEntity {
  id: string;
  name: string;
  schedule: string;
  status: BackupJobStatus;
  lastRun: Date | null;
  nextRun: Date | null;
  lastSize: string | null;
  retentionDays: number | null;
  createdAt: Date;
  updatedAt: Date;

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
