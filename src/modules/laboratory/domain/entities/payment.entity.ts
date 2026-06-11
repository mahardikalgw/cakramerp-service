import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PaymentMethodType =
  | 'bank_transfer'
  | 'virtual_account'
  | 'cash'
  | 'cheque';

export type PaymentEvidenceStatus = 'pending' | 'verified' | 'rejected';

export class PaymentMethod extends BaseEntity {
  declare id: string;
  declare name: string;
  declare type: PaymentMethodType;
  declare bankName: string | null;
  declare accountNumber: string | null;
  declare accountHolder: string | null;
  declare virtualAccountPattern: string | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<PaymentMethod> & {
      name: string;
      type: PaymentMethodType;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class PaymentEvidence extends BaseEntity {
  declare id: string;
  declare labPurchaseOrderId: string | null;
  declare labContractId: string | null;
  declare amount: number;
  declare paymentMethodId: string | null;
  declare fileName: string;
  declare fileUrl: string;
  declare fileType: string | null;
  declare status: PaymentEvidenceStatus;
  declare verifiedBy: string | null;
  declare verifiedAt: Date | null;
  declare rejectionReason: string | null;
  declare submittedBy: string | null;
  declare submittedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<PaymentEvidence> & {
      amount: number;
      fileName: string;
      fileUrl: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
