import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { TestingRequestLineTypeOrmEntity } from './testing-request-line-typeorm.entity';

@Entity('testing_requests')
export class TestingRequestTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare requestNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare projectName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare projectLocation: string;

  @Column({ type: 'int', nullable: true })
  declare sampleQuantity: number;

  @Column({ type: 'date', nullable: true })
  declare scheduleDate: Date;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date | undefined;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  // Customer portal fields
  @Column({ type: 'varchar', length: 20, default: 'admin' })
  declare submittedBy: string;

  @Column({ type: 'uuid', nullable: true, name: 'customer_user_id' })
  declare customerUserId: string | null;

  @Column({ type: 'text', nullable: true, name: 'project_address' })
  declare projectAddress: string | null;

  @Column({ type: 'date', nullable: true, name: 'preferred_schedule_date' })
  declare preferredScheduleDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  declare priority: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'billing_type' })
  declare billingType: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'testing_service_id' })
  declare testingServiceId: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'service_name',
  })
  declare serviceName: string | null;

  @Column({ type: 'text', nullable: true, name: 'additional_notes' })
  declare additionalNotes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'lab_contract_id' })
  declare labContractId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'lab_purchase_order_id' })
  declare labPurchaseOrderId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'sales_order_id' })
  declare salesOrderId: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'contract_document_url',
  })
  declare contractDocumentUrl: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'down_payment_amount',
  })
  declare downPaymentAmount: number;

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
    name: 'po_document_url',
  })
  declare poDocumentUrl: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'signed_document_url',
  })
  declare signedDocumentUrl: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'signed_document_filename',
  })
  declare signedDocumentFilename: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'signed_document_uploaded_at',
  })
  declare signedDocumentUploadedAt: Date | null;

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

  @Column({ type: 'timestamptz', nullable: true, name: 'document_verified_at' })
  declare documentVerifiedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'document_verified_by',
  })
  declare documentVerifiedBy: string | null;

  @Column({ type: 'boolean', default: false, name: 'quota_granted' })
  declare quotaGranted: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'quota_granted_at' })
  declare quotaGrantedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'quota_granted_by',
  })
  declare quotaGrantedBy: string | null;

  // Laboran assignment fields
  @Column({ type: 'uuid', nullable: true, name: 'assigned_laboran_id' })
  declare assignedLaboranId: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'assigned_laboran_name',
  })
  declare assignedLaboranName: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'assigned_at' })
  declare assignedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'assignment_notes' })
  declare assignmentNotes: string | null;

  // Contract billing fields
  @Column({ type: 'text', nullable: true, name: 'scope_of_testing' })
  declare scopeOfTesting: string | null;

  @Column({
    type: 'uuid',
    array: true,
    nullable: true,
    name: 'scope_of_testing_service_ids',
  })
  declare scopeOfTestingServiceIds: string[] | null;

  @Column({ type: 'int', nullable: true, name: 'contract_estimation' })
  declare contractEstimation: number | null;

  @Column({ type: 'int', nullable: true, name: 'contract_tempo_days' })
  declare contractTempoDays: number | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'signed_contract_url',
  })
  declare signedContractUrl: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'signed_contract_uploaded_at',
  })
  declare signedContractUploadedAt: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'contract_signing_deadline',
  })
  declare contractSigningDeadline: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'contract_confirmed_at',
  })
  declare contractConfirmedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'contract_confirmed_by',
  })
  declare contractConfirmedBy: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_unlimited' })
  declare isUnlimited: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'tax_percent',
  })
  declare taxPercent: number;

  @OneToMany(
    () => TestingRequestLineTypeOrmEntity,
    (line) => line.testingRequest,
    {
      cascade: true,
      eager: true,
    },
  )
  lines: TestingRequestLineTypeOrmEntity[];
}
