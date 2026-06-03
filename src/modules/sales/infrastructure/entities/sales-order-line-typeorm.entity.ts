import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { SalesOrderTypeOrmEntity } from './sales-order-typeorm.entity';

@Entity('sales_order_lines')
export class SalesOrderLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  salesOrderId: string;

  @ManyToOne(() => SalesOrderTypeOrmEntity, (order) => order.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'salesOrderId' })
  salesOrder: SalesOrderTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  quotationLineId: string | null;

  @Column({ type: 'uuid', nullable: true })
  itemId: string | null;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'integer', default: 0 })
  deliveredQuantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  lineType: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  fulfillmentStatus: string;
}
