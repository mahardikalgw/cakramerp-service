import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('discrepancy_reports')
export class DiscrepancyReportTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  declare employeeId: string;

  @Column({ type: 'date', name: 'attendance_date' })
  declare attendanceDate: Date;

  @Column({ type: 'text' })
  declare description: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  declare status: string;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by' })
  declare resolvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  declare resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  declare resolution: string | null;
}
