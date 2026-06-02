import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('goods_receipt_lines')
export class GoodsReceiptLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  goodsReceiptId: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  poQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  receivedQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  discrepancyQty: number;

  @Column({ type: 'varchar', length: 50 })
  uom: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  remarks: string;
}
