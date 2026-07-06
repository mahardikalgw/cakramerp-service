import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('ar_invoices')
export class ARInvoiceTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare invoiceNumber: string;

  @Column({ type: 'varchar', length: 100 })
  declare clientId: string;

  @Column({ type: 'varchar', length: 255 })
  declare clientName: string;

  @Column({ type: 'uuid', nullable: true })
  declare projectId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare segment: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare paidAmount: number;

  @Column({ type: 'date' })
  declare dueDate: Date;

  @Column({ type: 'date' })
  declare issueDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'uuid', nullable: true })
  declare customerId: string;

  @Column({ type: 'int', nullable: true })
  declare paymentTermDays: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare paymentTermLabel: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare additionalDiscount: number;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;
}
