import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { LabContractAttachmentTypeOrmEntity } from './lab-contract-attachment-typeorm.entity';

@Entity('lab_contracts')
export class LabContractTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare contractNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare testingRequestId: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'uuid', nullable: true })
  declare projectId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare projectName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare projectLocation: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare billingType: string;

  @Column({ type: 'date', nullable: true })
  declare startDate: Date;

  @Column({ type: 'date', nullable: true })
  declare endDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare contractValue: number;

  @Column({ type: 'int', nullable: true })
  declare totalQuota: number;

  @Column({ type: 'int', default: 0 })
  declare usedQuota: number;

  @Column({ type: 'int', nullable: true })
  declare remainingQuota: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare baseAmount: number;

  // Initial fee paid upfront at contract generation, excluding tax.
  // For unlimited contract-billing flows this equals the down-payment base
  // entered by admin (excluding tax). For cash-billing flows it stays 0
  // because the customer pays in full up front, not via a separate DP.
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'initial_fee',
  })
  declare initialFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 11 })
  declare taxPercent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare taxAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalAmount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare contractDocumentUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare taxInvoiceUrl: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  declare generatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare generatedBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare generatedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  declare expiresAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_unlimited' })
  declare isUnlimited: boolean;

  @Column({ type: 'date', nullable: true, name: 'billing_start_date' })
  declare billingStartDate: Date | null;

  @Column({ type: 'date', nullable: true, name: 'last_billing_date' })
  declare lastBillingDate: Date | null;

  @Column({ type: 'text', nullable: true, name: 'scope_of_testing' })
  declare scopeOfTesting: string | null;

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

  @Column({ type: 'timestamptz', nullable: true, name: 'closed_at' })
  declare closedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'closed_by' })
  declare closedBy: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'closed_by_name',
  })
  declare closedByName: string | null;

  /**
   * JSON array of testing service UUIDs that are in scope for this contract.
   * When set, addContractSamples() will reject any sample whose
   * testingServiceId is not in this list.
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'allowed_service_ids',
    default: null,
  })
  declare allowedServiceIds: string[] | null;

  @OneToMany(
    () => LabContractAttachmentTypeOrmEntity,
    (attachment) => attachment.labContract,
    { cascade: true, eager: true },
  )
  attachments: LabContractAttachmentTypeOrmEntity[];
}
