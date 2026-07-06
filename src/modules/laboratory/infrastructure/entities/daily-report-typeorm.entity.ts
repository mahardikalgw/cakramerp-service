import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { DailyReportLineTypeOrmEntity } from './daily-report-line-typeorm.entity';

@Entity('daily_reports')
export class DailyReportTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare reportNumber: string;

  @Column({ type: 'date' })
  declare reportDate: Date;

  @Column({ type: 'uuid' })
  declare testingRequestId: string;

  @Column({ type: 'varchar', length: 50 })
  declare testingRequestNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'timestamp', nullable: true })
  declare submittedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare approvedById: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @OneToMany(() => DailyReportLineTypeOrmEntity, (line) => line.dailyReport, {
    cascade: true,
    eager: true,
  })
  lines: DailyReportLineTypeOrmEntity[];
}
