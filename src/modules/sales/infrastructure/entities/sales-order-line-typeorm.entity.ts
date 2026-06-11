import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { SalesOrderTypeOrmEntity } from './sales-order-typeorm.entity';

@Entity('sales_order_lines')
export class SalesOrderLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare salesOrderId: string;

  @ManyToOne(() => SalesOrderTypeOrmEntity, (order) => order.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sales_order_id' })
  declare salesOrder: SalesOrderTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  declare quotationLineId: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare itemId: string | null;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'text', nullable: true })
  declare description: string | null;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'integer', default: 0 })
  declare deliveredQuantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare uom: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare discountAmount: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  declare lineType: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  declare fulfillmentStatus: string;
}
