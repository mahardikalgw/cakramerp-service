import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type NotificationEventType =
  | 'testing_request_submitted'
  | 'testing_request_approved'
  | 'schedule_confirmed'
  | 'schedule_completed'
  | 'test_result_submitted'
  | 'test_result_confirmed'
  | 'contract_generated'
  | 'contract_ready_for_signing'
  | 'signed_contract_uploaded'
  | 'contract_confirmed'
  | 'contract_signing_expired'
  | 'monthly_invoice_generated';

export class Notification extends BaseEntity {
  declare id: string;
  declare recipientUserId: string;
  declare eventType: NotificationEventType | string;
  declare title: string;
  declare message: string;
  declare actionUrl: string | null;
  declare actionLabel: string | null;
  declare entityType: string | null;
  declare entityId: string | null;
  declare emailSent: boolean;
  declare emailSentAt: Date | null;
  declare pushSent: boolean;
  declare pushSentAt: Date | null;
  declare pushError: string | null;
  declare isRead: boolean;
  declare readAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<Notification> & {
      recipientUserId: string;
      eventType: NotificationEventType | string;
      title: string;
      message: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
