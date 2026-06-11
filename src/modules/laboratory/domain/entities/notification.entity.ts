import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type NotificationType =
  | 'contract_issued'
  | 'po_issued'
  | 'schedule_created'
  | 'results_available'
  | 'invoice_generated'
  | 'payment_reminder'
  | 'contract_closed'
  | 'request_approved'
  | 'request_rejected'
  | 'report_finalized'
  | 'certificate_issued';

export class InAppNotification extends BaseEntity {
  declare id: string;
  declare userId: string;
  declare type: NotificationType | string;
  declare title: string;
  declare message: string;
  declare entityType: string | null;
  declare entityId: string | null;
  declare read: boolean;
  declare readAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<InAppNotification> & {
      userId: string;
      type: NotificationType | string;
      title: string;
      message: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
