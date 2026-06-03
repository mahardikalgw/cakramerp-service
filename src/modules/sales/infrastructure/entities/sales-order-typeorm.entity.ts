import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { SalesOrderLineTypeOrmEntity } from './sales-order-line-typeorm.entity';

@Entity('sales_orders')
export class SalesOrderTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  soNumber: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'varchar', length: 255 })
  customerName: string;

  @Column({ type: 'uuid', nullable: true })
  quotationId: string | null;

  @Column({ type: 'date' })
  orderDate: Date;

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
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
  paymentTermLabel: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  glPostingQueueId: string | null;

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string | null;

  @OneToMany(() => SalesOrderLineTypeOrmEntity, (line) => line.salesOrder, {
    cascade: true,
    eager: true,
  })
  lines: SalesOrderLineTypeOrmEntity[];
}
