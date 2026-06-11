import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type CertificateStatus = 'draft' | 'issued' | 'revoked';

export class LabCertificate extends BaseEntity {
  declare id: string;
  declare certificateNumber: string;
  declare testingRequestId: string;
  declare testingRequestNumber: string;
  declare testResultId: string | null;
  declare resultNumber: string | null;
  declare customerId: string;
  declare customerName: string;
  declare sampleCode: string | null;
  declare testingServiceId: string | null;
  declare serviceName: string | null;
  declare qrHash: string | null;
  declare issuedBy: string | null;
  declare issuedAt: Date | null;
  declare revokedBy: string | null;
  declare revokedAt: Date | null;
  declare revocationReason: string | null;
  declare minioPath: string | null;
  declare status: CertificateStatus;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabCertificate> & {
      certificateNumber: string;
      testingRequestId: string;
      testingRequestNumber: string;
      customerId: string;
      customerName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
