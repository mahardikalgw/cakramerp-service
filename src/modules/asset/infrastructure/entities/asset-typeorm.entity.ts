import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('assets')
export class AssetTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  assetNumber: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string

  @Column({ type: 'date' })
  acquisitionDate: Date

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  acquisitionCost: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  salvageValue: number

  @Column({ type: 'int' })
  usefulLifeMonths: number

  @Column({ type: 'varchar', length: 50, default: 'straight_line' })
  depreciationMethod: string

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  decliningBalanceRate: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalEstimatedUnits: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitsProducedToDate: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  currentBookValue: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  accumulatedDepreciation: number

  @Column({ type: 'varchar', length: 20, default: 'monthly' })
  depreciationSchedule: string

  @Column({ type: 'date', nullable: true })
  lastDepreciationDate: Date

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string

  @Column({ type: 'uuid', nullable: true })
  assignedToEmployeeId: string

  @Column({ type: 'text', nullable: true })
  notes: string
}
