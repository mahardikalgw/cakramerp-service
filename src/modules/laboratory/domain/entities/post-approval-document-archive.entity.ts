import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PostApprovalDocumentArchiveStatus = 'draft' | 'signed' | 'archived';

export type PostApprovalDocumentType =
  'contract' | 'tax_invoice' | 'testing_result' | 'lab_purchase_order';

export class PostApprovalDocumentArchive extends BaseEntity {
  declare id: string;
  declare documentType: PostApprovalDocumentType;
  declare testingRequestId: string | null;
  declare contractId: string | null;
  declare testingResultId: string | null;
  declare documentNumber: string;
  declare minioPath: string;
  declare signedDocumentUrl: string | null;
  declare uploadedBy: string | null;
  declare uploadedByName: string | null;
  declare uploadedAt: Date | null;
  declare originalFilename: string | null;
  declare status: PostApprovalDocumentArchiveStatus;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<PostApprovalDocumentArchive> & {
      documentType: PostApprovalDocumentType;
      documentNumber: string;
      minioPath: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
