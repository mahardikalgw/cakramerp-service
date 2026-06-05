import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('goods_receipts')
export class GoodsReceiptTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare grnNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare poId: string | undefined;

  @Column({ type: 'uuid' })
  declare warehouseId: string;

  @Column({ type: 'uuid', nullable: true })
  declare supplierId: string | undefined;

  @Column({ type: 'varchar', length: 255 })
  declare vendorName: string;

  @Column({ type: 'date' })
  declare receivedDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'confirmed' })
  declare status: string;

  @Column({ type: 'text', nullable: true })
  declare notes: string | undefined;

  @Column({ type: 'uuid' })
  declare createdBy: string | undefined;
}
