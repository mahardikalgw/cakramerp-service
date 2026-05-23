import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum BackupHistoryStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress',
}

export class BackupHistory extends BaseEntity {
  id: string;
  backupJobId: string;
  fileName: string;
  status: BackupHistoryStatus;
  size: number;
  completedAt: Date;
  errorMessage: string | null;
  filePath: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    props: Partial<BackupHistory> & { backupJobId: string; fileName: string },
  ) {
    super();
    Object.assign(this, props);
    this.status = props.status || BackupHistoryStatus.IN_PROGRESS;
    this.size = props.size || 0;
    this.completedAt = props.completedAt || new Date();
    this.errorMessage = props.errorMessage || null;
    this.filePath = props.filePath || null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
