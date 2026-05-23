import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('goods_receipts')
export class GoodsReceiptTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  grnNumber: string

  @Column({ type: 'uuid', nullable: true })
  poId: string

  @Column({ type: 'uuid' })
  warehouseId: string

  @Column({ type: 'varchar', length: 255 })
  vendorName: string

  @Column({ type: 'date' })
  receivedDate: Date

  @Column({ type: 'varchar', length: 50, default: 'confirmed' })
  status: string

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ type: 'uuid' })
  createdBy: string
}
