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
  declare backupJobId: string;

  @Column({ type: 'varchar', length: 255 })
  declare fileName: string;

  @Column({
    type: 'enum',
    enum: BackupHistoryStatus,
  })
  @Index()
  declare status: BackupHistoryStatus;

  @Column({ type: 'bigint' })
  declare size: number;

  @Column({ type: 'timestamp' })
  @Index()
  declare completedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare errorMessage: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare filePath: string | null;
}
