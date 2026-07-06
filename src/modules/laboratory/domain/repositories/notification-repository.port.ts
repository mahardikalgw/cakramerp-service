import { Notification } from '../entities/notification.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface NotificationRepositoryPort extends RepositoryPort<Notification> {
  findByRecipientUserId(
    recipientUserId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<Notification[]>;
  countUnreadByRecipientUserId(recipientUserId: string): Promise<number>;
  markAsRead(id: string): Promise<Notification | null>;
  markAllAsRead(recipientUserId: string): Promise<number>;
  markAsReadByIdAndRecipient(
    id: string,
    recipientUserId: string,
  ): Promise<boolean>;
  softDelete(id: string): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
