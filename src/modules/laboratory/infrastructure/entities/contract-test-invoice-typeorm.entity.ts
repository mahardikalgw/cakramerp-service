import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { ContractTestInvoiceResultTypeOrmEntity } from './contract-test-invoice-result-typeorm.entity';

@Entity('contract_test_invoices')
export class ContractTestInvoiceTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare invoiceNumber: string;

  @Column({ type: 'uuid', name: 'contract_id' })
  declare contractId: string;

  @Column({ type: 'uuid', nullable: true, name: 'testing_schedule_id' })
  declare testingScheduleId: string | null;

  @Column({ type: 'date', name: 'billing_period_start' })
  declare billingPeriodStart: Date;

  @Column({ type: 'date', name: 'billing_period_end' })
  declare billingPeriodEnd: Date;

  @Column({ type: 'int', default: 0, name: 'total_samples' })
  declare totalSamples: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'base_amount',
  })
  declare baseAmount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 11,
    name: 'tax_percent',
  })
  declare taxPercent: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'tax_amount',
  })
  declare taxAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'total_amount',
  })
  declare totalAmount: number;

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
    default: 0,
    name: 'amount_due',
  })
  declare amountDue: number;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'date', nullable: true, name: 'due_date' })
  declare dueDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'issued_at' })
  declare issuedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  declare paidAt: Date | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    name: 'paid_amount',
  })
  declare paidAmount: number | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'invoice_document_url',
  })
  declare invoiceDocumentUrl: string | null;

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
    length: 255,
    nullable: true,
    name: 'payment_verified_by_name',
  })
  declare paymentVerifiedByName: string | null;

  @Column({ type: 'text', nullable: true })
  declare notes: string | null;

  @OneToMany(
    () => ContractTestInvoiceResultTypeOrmEntity,
    (line) => line.invoice,
    { cascade: true, eager: true },
  )
  lines: ContractTestInvoiceResultTypeOrmEntity[];
}
