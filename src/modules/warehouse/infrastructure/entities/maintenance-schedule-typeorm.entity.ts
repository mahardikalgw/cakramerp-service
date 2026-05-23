import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('maintenance_schedules')
export class MaintenanceScheduleTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  equipmentId: string

  @Column({ type: 'varchar', length: 50 })
  intervalType: string

  @Column({ type: 'integer' })
  intervalValue: number

  @Column({ type: 'date', nullable: true })
  lastDoneDate: Date

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lastDoneHours: number

  @Column({ type: 'date', nullable: true })
  nextDueDate: Date

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  nextDueHours: number

  @Column({ type: 'varchar', length: 500 })
  description: string
}
