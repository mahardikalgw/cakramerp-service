import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('warehouses')
export class WarehouseTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 255 })
  location: string

  @Column({ type: 'varchar', length: 50 })
  type: string

  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
