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

  @Column({ type: 'uuid', nullable: true, name: 'sales_order_id' })
  declare salesOrderId: string | null;

  @Column({ type: 'int', nullable: true })
  declare paymentTermDays: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare paymentTermLabel: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare additionalDiscount: number;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;

  // ─── Lab billing fields (single source of truth for all billing types) ──

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'source_type' })
  declare sourceType: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'source_id' })
  declare sourceId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'contract_id' })
  declare contractId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'testing_schedule_id' })
  declare testingScheduleId: string | null;

  @Column({ type: 'date', nullable: true, name: 'billing_period_start' })
  declare billingPeriodStart: Date | null;

  @Column({ type: 'date', nullable: true, name: 'billing_period_end' })
  declare billingPeriodEnd: Date | null;

  @Column({ type: 'int', default: 0, name: 'total_samples' })
  declare totalSamples: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'initial_fee_applied',
  })
  declare initialFeeApplied: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    name: 'amount_due',
  })
  declare amountDue: number | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'payment_proof_url',
  })
  declare paymentProofUrl: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'payment_proof_filename',
  })
  declare paymentProofFilename: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'payment_proof_uploaded_at',
  })
  declare paymentProofUploadedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'payment_verified_at' })
  declare paymentVerifiedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'payment_verified_by',
  })
  declare paymentVerifiedBy: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'payment_verified_by_name',
  })
  declare paymentVerifiedByName: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'issued_at' })
  declare issuedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  declare paidAt: Date | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'invoice_document_url',
  })
  declare invoiceDocumentUrl: string | null;
}
