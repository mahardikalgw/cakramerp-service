import { InAppNotification } from '../entities/notification.entity';
import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';

export interface NotificationRepositoryPort extends RepositoryPort<InAppNotification> {
  findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<InAppNotification[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  markAsRead(id: string): Promise<InAppNotification | null>;
  markAllAsRead(userId: string): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
