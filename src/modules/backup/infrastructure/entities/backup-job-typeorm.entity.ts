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
  declare name: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  declare schedule: string;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.ACTIVE,
  })
  @Index()
  declare status: BackupStatus;

  @Column({ type: 'timestamp', nullable: true })
  declare lastRun: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  declare nextRun: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare lastSize: string | null;

  @Column({ type: 'text', nullable: true })
  declare retentionDays: number | null;
}
