import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('stock_opname_lines')
export class StockOpnameLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  sessionId: string

  @Column({ type: 'uuid' })
  itemId: string

  @Column({ type: 'varchar', length: 255 })
  itemName: string

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  systemQty: number

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  actualQty: number

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  varianceQty: number

  @Column({ type: 'varchar', length: 50 })
  uom: string
}
