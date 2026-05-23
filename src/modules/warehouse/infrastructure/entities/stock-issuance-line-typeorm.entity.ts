import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('stock_issuance_lines')
export class StockIssuanceLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  issuanceId: string

  @Column({ type: 'uuid' })
  itemId: string

  @Column({ type: 'varchar', length: 255 })
  itemName: string

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number

  @Column({ type: 'varchar', length: 50 })
  uom: string
}
