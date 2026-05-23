import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('stock_issuances')
export class StockIssuanceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  issuanceNumber: string

  @Column({ type: 'uuid' })
  warehouseId: string

  @Column({ type: 'varchar', length: 50 })
  destinationType: string

  @Column({ type: 'uuid' })
  destinationId: string

  @Column({ type: 'varchar', length: 255 })
  destinationName: string

  @Column({ type: 'date' })
  issuanceDate: Date

  @Column({ type: 'varchar', length: 50, default: 'confirmed' })
  status: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  reversalReason: string

  @Column({ type: 'timestamp', nullable: true })
  reversedAt: Date

  @Column({ type: 'uuid' })
  createdBy: string
}
