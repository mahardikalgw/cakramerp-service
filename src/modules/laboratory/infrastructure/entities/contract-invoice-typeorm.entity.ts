import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('contract_invoices')
export class ContractInvoiceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, name: 'invoice_number' })
  declare invoiceNumber: string;

  @Column({ type: 'uuid', name: 'contract_id' })
  declare contractId: string;

  @Column({ type: 'date', name: 'billing_period_start' })
  declare billingPeriodStart: Date;

  @Column({ type: 'date', name: 'billing_period_end' })
  declare billingPeriodEnd: Date;

  @Column({ type: 'int', default: 0, name: 'total_samples' })
  declare totalSamples: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'base_amount' })
  declare baseAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 11, name: 'tax_percent' })
  declare taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'tax_amount' })
  declare taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'total_amount' })
  declare totalAmount: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'invoice_document_url' })
  declare invoiceDocumentUrl: string | null;

  @Column({ type: 'varchar', length: 50, default: 'issued' })
  declare status: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  declare paidAt: Date | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true, name: 'paid_amount' })
  declare paidAmount: number | null;
}