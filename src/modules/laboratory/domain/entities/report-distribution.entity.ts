import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type DistributionChannel = 'email' | 'portal' | 'physical' | 'whatsapp';

export type DistributionStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export type ArchiveDocumentType =
  | 'contract'
  | 'purchase_order'
  | 'invoice'
  | 'test_report'
  | 'certificate'
  | 'daily_report'
  | 'sample_tracking';

export class ReportDistribution extends BaseEntity {
  declare id: string;
  declare documentType: string;
  declare documentId: string;
  declare documentNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare channel: DistributionChannel;
  declare recipientEmail: string | null;
  declare recipientName: string | null;
  declare status: DistributionStatus;
  declare sentAt: Date | null;
  declare deliveredAt: Date | null;
  declare failureReason: string | null;
  declare retryCount: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<ReportDistribution> & {
      documentType: string;
      documentId: string;
      documentNumber: string;
      customerId: string;
      channel: DistributionChannel;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class ArchivedDocument extends BaseEntity {
  declare id: string;
  declare documentType: ArchiveDocumentType;
  declare entityId: string;
  declare documentNumber: string;
  declare minioPath: string;
  declare minioBucket: string;
  declare contentType: string;
  declare fileSize: number | null;
  declare customerId: string | null;
  declare customerName: string | null;
  declare archivedBy: string | null;
  declare archivedAt: Date;
  declare retentionPeriodDays: number;
  declare expiresAt: Date | null;
  declare tags: string[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<ArchivedDocument> & {
      documentType: ArchiveDocumentType;
      entityId: string;
      documentNumber: string;
      minioPath: string;
      minioBucket: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
