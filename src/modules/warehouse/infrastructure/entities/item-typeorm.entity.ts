import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('items')
export class ItemTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 100 })
  category: string

  @Column({ type: 'varchar', length: 50 })
  uom: string

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  minStockLevel: number

  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
