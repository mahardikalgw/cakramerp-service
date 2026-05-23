import { Entity, Column, Index } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('shift_schedules')
export class ShiftScheduleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'employee_id' })
  @Index()
  employeeId: string

  @Column({ type: 'date' })
  @Index()
  date: Date

  @Column({ type: 'varchar', length: 20, name: 'shift_type' })
  shiftType: string

  @Column({ type: 'uuid', nullable: true, name: 'site_id' })
  siteId: string | null

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'site_name' })
  siteName: string | null

  @Column({ type: 'time', nullable: true, name: 'start_time' })
  startTime: string | null

  @Column({ type: 'time', nullable: true, name: 'end_time' })
  endTime: string | null

  @Column({ type: 'text', nullable: true })
  notes: string | null
}
