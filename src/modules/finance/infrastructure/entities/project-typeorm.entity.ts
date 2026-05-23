import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('projects')
export class ProjectTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  segment: string

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  budget: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  actualCost: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercent: number

  @Column({ type: 'date' })
  startDate: Date

  @Column({ type: 'date', nullable: true })
  endDate: Date
}
