import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseOrderLineTypeOrmEntity } from './purchase-order-line-typeorm.entity';

@Entity('purchase_orders')
export class PurchaseOrderTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  poNumber: string;

  @Column({ type: 'uuid' })
  supplierId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplierName: string;

  @Column({ type: 'uuid', nullable: true })
  purchaseRequestId: string;

  @Column({ type: 'date' })
  orderDate: Date;

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'int', default: 30 })
  paymentTermDays: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTermLabel: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'uuid', nullable: true })
  glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string;

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
