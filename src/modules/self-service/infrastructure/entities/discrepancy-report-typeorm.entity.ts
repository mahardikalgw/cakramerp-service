import { Entity, Column, Index } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('discrepancy_reports')
export class DiscrepancyReportTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  employeeId: string

  @Column({ type: 'date', name: 'attendance_date' })
  attendanceDate: Date

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by' })
  resolvedBy: string | null

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null

  @Column({ type: 'text', nullable: true })
  resolution: string | null
}
