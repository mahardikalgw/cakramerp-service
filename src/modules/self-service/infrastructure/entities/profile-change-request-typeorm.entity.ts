import { Entity, Column, Index } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('profile_change_requests')
export class ProfileChangeRequestTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  employeeId: string

  @Column({ type: 'varchar', length: 100, name: 'field_name' })
  fieldName: string

  @Column({ type: 'text', name: 'old_value' })
  oldValue: string

  @Column({ type: 'text', name: 'new_value' })
  newValue: string

  @Column({ type: 'text' })
  reason: string

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null
}
