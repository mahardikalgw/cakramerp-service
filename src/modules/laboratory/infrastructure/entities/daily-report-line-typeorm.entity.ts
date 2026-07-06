import { Entity, Column, ManyToOne } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { DailyReportTypeOrmEntity } from './daily-report-typeorm.entity';

@Entity('daily_report_lines')
export class DailyReportLineTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare dailyReportId: string;

  @Column({ type: 'uuid' })
  declare testResultId: string;

  @Column({ type: 'varchar', length: 50 })
  declare resultNumber: string;

  @Column({ type: 'varchar', length: 50 })
  declare sampleCode: string;

  @Column({ type: 'varchar', length: 255 })
  declare serviceName: string;

  @Column({ type: 'varchar', length: 255 })
  declare parameter: string;

  @Column({ type: 'text' })
  declare resultValue: string;

  @ManyToOne(() => DailyReportTypeOrmEntity, (report) => report.lines)
  dailyReport: DailyReportTypeOrmEntity;
}
