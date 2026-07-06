import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { SalesOrderLineTypeOrmEntity } from './sales-order-line-typeorm.entity';

@Entity('sales_orders')
export class SalesOrderTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare soNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'uuid', nullable: true })
  declare quotationId: string | null;

  @Column({ type: 'date' })
  declare orderDate: Date;

  @Column({ type: 'date', nullable: true })
  declare expectedDeliveryDate: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
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
  declare paymentTermLabel: string | null;

  @Column({ type: 'text', nullable: true })
  declare notes: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string | null;

  @OneToMany(() => SalesOrderLineTypeOrmEntity, (line) => line.salesOrder, {
    cascade: true,
    eager: true,
  })
  lines: SalesOrderLineTypeOrmEntity[];
}
