import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type LabContractStatus =
  | 'draft'
  | 'review'
  | 'signed'
  | 'active'
  | 'closed';

export class LabContractAttachment extends BaseEntity {
  declare id: string;
  declare labContractId: string;
  declare fileName: string;
  declare fileUrl: string;
  declare fileType: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabContractAttachment> & {
      labContractId: string;
      fileName: string;
      fileUrl: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class LabContract extends BaseEntity {
  declare id: string;
  declare contractNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare projectId?: string;
  declare projectName?: string;
  declare startDate?: Date | string;
  declare endDate?: Date | string;
  declare contractValue?: number;
  declare totalQuota?: number;
  declare usedQuota: number;
  declare remainingQuota?: number;
  declare status: LabContractStatus;
  declare createdBy?: string;
  declare approvedBy?: string;
  declare approvedAt?: Date;
  declare expiresAt?: Date | null;
  declare attachments: LabContractAttachment[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabContract> & {
      contractNumber: string;
      customerId: string;
      customerName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
