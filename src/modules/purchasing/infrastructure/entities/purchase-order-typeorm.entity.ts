import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseOrderLineTypeOrmEntity } from './purchase-order-line-typeorm.entity';

@Entity('purchase_orders')
export class PurchaseOrderTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true, name: 'order_number' })
  declare poNumber: string;

  @Column({ type: 'uuid' })
  declare supplierId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare supplierName: string;

  @Column({ type: 'uuid', nullable: true })
  declare purchaseRequestId: string;

  @Column({ type: 'date' })
  declare orderDate: Date;

  @Column({ type: 'date', nullable: true, name: 'expected_date' })
  declare expectedDeliveryDate: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare grandTotal: number;

  @Column({ type: 'int', default: 30 })
  declare paymentTermDays: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare paymentTermLabel: string;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'uuid', nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string | undefined;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;

  @OneToMany(
    () => PurchaseOrderLineTypeOrmEntity,
    (line) => line.purchaseOrder,
    {
      cascade: true,
      eager: true,
    },
  )
  lines: PurchaseOrderLineTypeOrmEntity[];
}
