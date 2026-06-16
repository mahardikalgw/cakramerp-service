import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PostApprovalLabContractStatus =
  | 'draft'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'awaiting_signature';

export type LabContractSampleStatus =
  | 'pending'
  | 'scheduled'
  | 'testing'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export class LabContractSample extends BaseEntity {
  declare id: string;
  declare contractId: string;
  declare sampleId: string;
  declare testingServiceId: string | null;
  declare serviceName: string;
  declare sampleCode: string | null;
  declare sampleDescription: string | null;
  declare sampleQuantity: number;
  declare usedQuantity: number;
  declare completedQuantity: number;
  declare unitPrice: number;
  declare totalPrice: number;
  declare status: LabContractSampleStatus;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabContractSample> & {
      contractId: string;
      sampleId: string;
      serviceName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class PostApprovalLabContract extends BaseEntity {
  declare id: string;
  declare contractNumber: string;
  declare testingRequestId: string;
  declare customerId: string;
  declare customerName: string;
  declare projectName: string | null;
  declare projectLocation: string | null;
  declare testingType: string | null;
  declare billingType: string | null;
  declare totalQuota: number;
  declare usedQuota: number;
  declare remainingQuota: number;
  declare baseAmount: number;
  declare taxPercent: number;
  declare taxAmount: number;
  declare totalAmount: number;
  declare contractDocumentUrl: string | null;
  declare taxInvoiceUrl: string | null;
  declare status: PostApprovalLabContractStatus;
  declare generatedAt: Date | null;
  declare generatedBy: string | null;
  declare generatedByName: string | null;
  declare expiresAt: Date | null;
  declare isUnlimited: boolean;
  declare billingStartDate: Date | null;
  declare lastBillingDate: Date | null;
  declare scopeOfTesting: string | null;
  declare contractEstimation: number | null;
  declare contractTempoMonths: number | null;
  declare signedContractUrl: string | null;
  declare contractSigningDeadline: Date | null;
  declare contractConfirmedAt: Date | null;
  declare contractConfirmedBy: string | null;
  declare lines: LabContractSample[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<PostApprovalLabContract> & {
      contractNumber: string;
      customerId: string;
      customerName: string;
      testingRequestId: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}