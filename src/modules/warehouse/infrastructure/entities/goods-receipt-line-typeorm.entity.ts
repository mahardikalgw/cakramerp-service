import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('goods_receipt_lines')
export class GoodsReceiptLineTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare goodsReceiptId: string;

  @Column({ type: 'uuid' })
  declare itemId: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'integer' })
  declare poQty: number;

  @Column({ type: 'integer' })
  declare receivedQty: number;

  @Column({ type: 'integer', default: 0 })
  declare discrepancyQty: number;

  @Column({ type: 'varchar', length: 50 })
  declare uom: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare remarks: string;
}
