import { Entity, Column, Index } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('leave_requests')
export class LeaveRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  employeeId: string

  @Column({ type: 'uuid', name: 'leave_type_id' })
  leaveTypeId: string

  @Column({ type: 'varchar', length: 100, name: 'leave_type_name', nullable: true })
  leaveTypeName: string | null

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date

  @Column({ type: 'decimal', precision: 5, scale: 1, name: 'working_days' })
  workingDays: number

  @Column({ type: 'text' })
  reason: string

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'attachment_path' })
  attachmentPath: string | null

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy: string | null

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt: Date | null

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null
}
