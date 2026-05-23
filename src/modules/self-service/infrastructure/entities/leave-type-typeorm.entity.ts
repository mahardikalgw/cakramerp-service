import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('leave_types')
export class LeaveTypeTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string

  @Column({ type: 'int', name: 'default_days_per_year' })
  defaultDaysPerYear: number

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean
}
