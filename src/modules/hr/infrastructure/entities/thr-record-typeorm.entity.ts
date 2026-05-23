import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('thr_records')
export class ThrRecordTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string

  @Column({ type: 'varchar', length: 255 })
  employeeName: string

  @Column({ type: 'integer' })
  year: number

  @Column({ type: 'varchar', length: 50 })
  employmentType: string

  @Column({ type: 'integer' })
  monthsOfService: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  monthlySalary: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  thrAmount: number

  @Column({ type: 'boolean' })
  isProRated: boolean

  @Column({ type: 'boolean' })
  isExcluded: boolean

  @Column({ type: 'varchar', length: 50, default: 'calculated' })
  status: string

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date
}
