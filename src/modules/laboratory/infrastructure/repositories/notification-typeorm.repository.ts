import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationTypeOrmEntity } from '../entities/notification-typeorm.entity';
import { NotificationRepositoryPort } from '../../domain/repositories/notification-repository.port';

@Injectable()
export class NotificationTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Notification, NotificationTypeOrmEntity>
  implements NotificationRepositoryPort
{
  protected readonly repository: Repository<NotificationTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(NotificationTypeOrmEntity);
  }

  toDomain(entity: NotificationTypeOrmEntity): Notification {
    return new Notification({
      id: entity.id,
      recipientUserId: entity.recipientUserId,
      eventType: entity.eventType,
      title: entity.title,
      message: entity.message,
      actionUrl: entity.actionUrl,
      actionLabel: entity.actionLabel,
      entityType: entity.entityType,
      entityId: entity.entityId,
      emailSent: entity.emailSent,
      emailSentAt: entity.emailSentAt,
      pushSent: entity.pushSent,
      pushSentAt: entity.pushSentAt,
      pushError: entity.pushError,
      isRead: entity.isRead,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Notification): NotificationTypeOrmEntity {
    const entity = new NotificationTypeOrmEntity();
    entity.id = domain.id;
    entity.recipientUserId = domain.recipientUserId;
    entity.eventType = domain.eventType as string;
    entity.title = domain.title;
    entity.message = domain.message;
    entity.actionUrl = domain.actionUrl ?? null;
    entity.actionLabel = domain.actionLabel ?? null;
    entity.entityType = domain.entityType ?? null;
    entity.entityId = domain.entityId ?? null;
    entity.emailSent = domain.emailSent ?? false;
    entity.emailSentAt = domain.emailSentAt ?? null;
    entity.pushSent = domain.pushSent ?? false;
    entity.pushSentAt = domain.pushSentAt ?? null;
    entity.pushError = domain.pushError ?? null;
    entity.isRead = domain.isRead ?? false;
    entity.readAt = domain.readAt ?? null;
    return entity;
  }

  async findByRecipientUserId(
    recipientUserId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<Notification[]> {
    const where: any = { recipientUserId };
    if (options?.unreadOnly) where.isRead = false;
    const entities = await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: ((options?.page ?? 1) - 1) * (options?.limit ?? 20),
      take: options?.limit ?? 20,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async countUnreadByRecipientUserId(recipientUserId: string): Promise<number> {
    return this.repository.count({ where: { recipientUserId, isRead: false } as any });
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const entity = await this.repository.findOne({ where: { id } as any });
    if (!entity) return null;
    entity.isRead = true;
    entity.readAt = new Date();
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async markAllAsRead(recipientUserId: string): Promise<number> {
    const result = await this.repository.update(
      { recipientUserId, isRead: false } as any,
      { isRead: true, readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  async markAsReadByIdAndRecipient(id: string, recipientUserId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, recipientUserId, isRead: false } as any,
      { isRead: true, readAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }
}
