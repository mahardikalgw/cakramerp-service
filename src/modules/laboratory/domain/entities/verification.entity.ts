import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type VerificationItemType =
  | 'contract'
  | 'purchase_order'
  | 'payment'
  | 'supporting_document';

export class VerificationChecklistItem extends BaseEntity {
  declare id: string;
  declare verificationId: string;
  declare itemType: VerificationItemType;
  declare itemName: string;
  declare documentUrl: string | null;
  declare verified: boolean;
  declare verifiedBy: string | null;
  declare verifiedAt: Date | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<VerificationChecklistItem> & {
      verificationId: string;
      itemType: VerificationItemType;
      itemName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class Verification extends BaseEntity {
  declare id: string;
  declare entityType: 'contract' | 'purchase_order';
  declare entityId: string;
  declare entityNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare status: VerificationStatus;
  declare verifiedBy: string | null;
  declare verifiedAt: Date | null;
  declare rejectionReason: string | null;
  declare activatedAt: Date | null;
  declare items: VerificationChecklistItem[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<Verification> & {
      entityType: 'contract' | 'purchase_order';
      entityId: string;
      entityNumber: string;
      customerId: string;
      customerName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
