import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('kpi_alerts')
export class KpiAlertTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  type: string

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'varchar', length: 50 })
  severity: string

  @Column({ type: 'varchar', length: 50, default: 'unread' })
  status: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  relatedValue: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  thresholdValue: number

  @Column({ type: 'varchar', length: 500, nullable: true })
  relatedUrl: string
}
