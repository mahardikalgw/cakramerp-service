import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

export enum BackupHistoryStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress',
}

@Entity('backup_history')
export class BackupHistoryTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @Index()
  backupJobId: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({
    type: 'enum',
    enum: BackupHistoryStatus,
  })
  @Index()
  status: BackupHistoryStatus;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'timestamp' })
  @Index()
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filePath: string | null;
}
