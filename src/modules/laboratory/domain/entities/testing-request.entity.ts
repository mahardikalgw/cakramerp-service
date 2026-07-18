import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type TestingRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'sampling'
  | 'testing'
  | 'report_draft'
  | 'completed'
  | 'cancelled';

export class TestingRequestLine extends BaseEntity {
  declare id: string;
  declare testingRequestId: string;
  declare testingServiceId: string | null;
  declare serviceName: string | null;
  declare sampleCode: string | null;
  declare sampleQuantity: number;
  declare unitPrice: number;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingRequestLine> & {
      testingRequestId: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class TestingRequest extends BaseEntity {
  declare id: string;
  declare requestNumber: string;
  declare customerId: string;
  declare customerName?: string;
  declare projectName: string;
  declare projectLocation: string | null;
  declare sampleQuantity: number;
  declare scheduleDate: Date | string | null;
  declare notes: string | null;
  declare status: TestingRequestStatus;
  declare createdBy?: string;
  declare approvedBy?: string;
  declare approvedAt?: Date;
  declare rejectionReason?: string;
  // Customer portal fields
  declare submittedBy?: 'customer' | 'admin';
  declare customerUserId?: string;
  declare projectAddress?: string;
  declare preferredScheduleDate?: Date | string;
  declare priority?: 'normal' | 'urgent';
  declare billingType?: 'contract' | 'cash' | null;
  declare testingServiceId?: string | null;
  declare serviceName?: string | null;
  declare labContractId?: string | null;
  declare labPurchaseOrderId?: string | null;
  declare salesOrderId?: string | null;
  // Document fields
  declare additionalNotes?: string | null;
  declare invoiceDocumentUrl?: string | null;
  declare contractDocumentUrl?: string | null;
  declare downPaymentAmount?: number | null;
  declare poDocumentUrl?: string | null;
  declare signedDocumentUrl?: string | null;
  declare signedDocumentFilename?: string | null;
  declare signedDocumentUploadedAt?: Date | null;
  declare paymentProofUrl?: string | null;
  declare paymentProofFilename?: string | null;
  declare paymentProofUploadedAt?: Date | null;
  declare documentVerifiedAt?: Date | null;
  declare documentVerifiedBy?: string | null;
  declare quotaGranted?: boolean;
  declare quotaGrantedAt?: Date | null;
  declare quotaGrantedBy?: string | null;
  // Laboran assignment fields
  declare assignedLaboranId?: string;
  declare assignedLaboranName?: string;
  declare assignedAt?: Date;
  declare assignmentNotes?: string;

  // Contract billing fields
  declare scopeOfTesting?: string | null;
  declare scopeOfTestingServiceIds?: string[] | null;
  declare contractEstimation?: number | null;
  declare contractTempoDays?: number | null;
  declare signedContractUrl?: string | null;
  declare signedContractUploadedAt?: Date | null;
  declare contractSigningDeadline?: Date | null;
  declare contractConfirmedAt?: Date | null;
  declare contractConfirmedBy?: string | null;
  declare isUnlimited?: boolean;
  declare taxPercent?: number;

  declare lines: TestingRequestLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingRequest> & {
      requestNumber: string;
      customerId: string;
      projectName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
