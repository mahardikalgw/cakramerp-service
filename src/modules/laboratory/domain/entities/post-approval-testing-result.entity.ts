import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PostApprovalTestingResultStatus =
  'draft' | 'submitted' | 'confirmed' | 'rejected' | 'archived';

export class PostApprovalTestingResult extends BaseEntity {
  declare id: string;
  declare resultNumber: string | null;
  declare sampleId: string;
  declare sampleCode: string | null;
  declare testingServiceId: string | null;
  declare serviceName: string | null;
  declare parameter: string | null;
  declare resultValue: string | null;
  declare contractId: string;
  declare contractSampleId: string | null;
  declare scheduleId: string | null;
  declare scheduleSampleId: string | null;
  declare sampleUnit: number | null;
  declare submittedBy: string;
  declare submittedByName: string;
  declare submittedAt: Date;
  declare resultData: Record<string, unknown>;
  declare resultNotes: string | null;
  declare status: PostApprovalTestingResultStatus;
  declare confirmedBy: string | null;
  declare confirmedByName: string | null;
  declare confirmedAt: Date | null;
  declare rejectionReason: string | null;
  declare certificateDocumentId: string | null;
  declare testingDate: Date | null;
  declare createdDate: Date | null;
  declare mutu: string | null;
  declare produk: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<PostApprovalTestingResult> & {
      sampleId: string;
      contractId: string;
      submittedBy: string;
      submittedByName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
