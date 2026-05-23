import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('bpjs_enrollments')
export class BpjsEnrollmentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string

  @Column({ type: 'varchar', length: 50 })
  program: string

  @Column({ type: 'varchar', length: 100 })
  memberNumber: string

  @Column({ type: 'date' })
  enrollmentDate: Date

  @Column({ type: 'date', nullable: true })
  endDate: Date

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  salary: number

  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
