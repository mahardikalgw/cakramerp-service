import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('stock_ledger')
export class StockLedgerTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  itemId: string

  @Column({ type: 'uuid' })
  warehouseId: string

  @Column({ type: 'varchar', length: 50 })
  movementType: string

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  balanceAfter: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceType: string

  @Column({ type: 'uuid', nullable: true })
  referenceId: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string

  @Column({ type: 'uuid' })
  createdBy: string
}
