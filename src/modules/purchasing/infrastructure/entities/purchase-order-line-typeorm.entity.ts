import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseOrderTypeOrmEntity } from './purchase-order-typeorm.entity';

@Entity('purchase_order_lines')
export class PurchaseOrderLineTypeOrmEntity extends TypeOrmBaseEntity {
  @ManyToOne(() => PurchaseOrderTypeOrmEntity, (order) => order.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_order_id' })
  declare purchaseOrder: PurchaseOrderTypeOrmEntity;

  @Column({ type: 'uuid', name: 'purchase_order_id' })
  declare purchaseOrderId: string;

  @Column({ type: 'uuid', nullable: true })
  declare purchaseRequestLineId: string;

  @Column({ type: 'uuid', nullable: true })
  declare itemId: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'integer', default: 0 })
  declare receivedQuantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare uom: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare unitCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare totalCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare discountAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  declare lineType: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  declare fulfillmentStatus: string;
}
