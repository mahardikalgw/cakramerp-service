import { Injectable, Inject } from '@nestjs/common';
import { InAppNotification } from '../../domain/entities/notification.entity';
import type { NotificationRepositoryPort } from '../../domain/repositories/notification-repository.port';
import { NOTIFICATION_REPOSITORY } from '../../domain/repositories/notification-repository.port';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async send(dto: {
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<InAppNotification> {
    const notification = new InAppNotification({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      read: false,
    } as any);
    return this.notificationRepo.save(notification);
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ) {
    return this.notificationRepo.findByUserId(userId, options);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepo.countUnreadByUserId(userId);
  }

  async markAsRead(id: string): Promise<InAppNotification | null> {
    return this.notificationRepo.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllAsRead(userId);
  }
}
