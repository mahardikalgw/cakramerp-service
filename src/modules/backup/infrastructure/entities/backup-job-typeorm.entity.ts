import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

export enum BackupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RUNNING = 'running',
}

@Entity('backup_jobs')
export class BackupJobTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  schedule: string;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.ACTIVE,
  })
  @Index()
  status: BackupStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastRun: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRun: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lastSize: string | null;

  @Column({ type: 'text', nullable: true })
  retentionDays: number | null;
}
