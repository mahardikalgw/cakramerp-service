import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('ap_invoices')
export class APInvoiceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare invoiceNumber: string;

  @Column({ type: 'uuid' })
  declare vendorId: string;

  @Column({ type: 'varchar', length: 255 })
  declare vendorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare supplierInvoiceNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare poReferenceId: string;

  @Column({ type: 'uuid', nullable: true })
  declare grnReferenceId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare paidAmount: number;

  @Column({ type: 'date' })
  declare invoiceDate: Date;

  @Column({ type: 'date' })
  declare dueDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  declare status: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  declare threeWayMatchStatus: string;

  @Column({ type: 'uuid', nullable: true })
  declare bankAccountId: string;

  @Column({ type: 'date', nullable: true })
  declare scheduledPaymentDate: Date;

  @Column({ type: 'uuid', nullable: true })
  declare supplierId: string;

  @Column({ type: 'int', nullable: true })
  declare paymentTermDays: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare paymentTermLabel: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare additionalDiscount: number;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;
}
