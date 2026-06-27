import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type ClosingEntityType = 'contract' | 'purchase_order';

export type ClosingChecklistItemType =
  | 'invoice_paid'
  | 'certificate_issued'
  | 'documentation_completed'
  | 'all_tests_completed';

export type ClosingStatus =
  'pending' | 'in_progress' | 'completed' | 'cancelled';

export class ClosingChecklistItem extends BaseEntity {
  declare id: string;
  declare closingId: string;
  declare itemType: ClosingChecklistItemType;
  declare itemName: string;
  declare completed: boolean;
  declare completedBy: string | null;
  declare completedAt: Date | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<ClosingChecklistItem> & {
      closingId: string;
      itemType: ClosingChecklistItemType;
      itemName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class Closing extends BaseEntity {
  declare id: string;
  declare entityType: ClosingEntityType;
  declare entityId: string;
  declare entityNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare status: ClosingStatus;
  declare closedBy: string | null;
  declare closedAt: Date | null;
  declare closingReason: string | null;
  declare items: ClosingChecklistItem[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<Closing> & {
      entityType: ClosingEntityType;
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
