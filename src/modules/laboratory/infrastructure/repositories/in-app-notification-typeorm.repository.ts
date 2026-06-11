import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { InAppNotification } from '../../domain/entities/notification.entity';
import { InAppNotificationTypeOrmEntity } from '../entities/in-app-notification-typeorm.entity';
import { NotificationRepositoryPort } from '../../domain/repositories/notification-repository.port';

@Injectable()
export class InAppNotificationTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<
    InAppNotification,
    InAppNotificationTypeOrmEntity
  >
  implements NotificationRepositoryPort
{
  protected readonly repository: Repository<InAppNotificationTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(InAppNotificationTypeOrmEntity);
  }

  toDomain(entity: InAppNotificationTypeOrmEntity): InAppNotification {
    return new InAppNotification({
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      entityType: entity.entityType,
      entityId: entity.entityId,
      read: entity.read,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: InAppNotification): InAppNotificationTypeOrmEntity {
    const entity = new InAppNotificationTypeOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.type = domain.type;
    entity.title = domain.title;
    entity.message = domain.message;
    entity.entityType = domain.entityType ?? '';
    entity.entityId = domain.entityId || (null as any);
    entity.read = domain.read ?? false;
    entity.readAt = domain.readAt ?? new Date();
    return entity;
  }

  async findByUserId(
    userId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<InAppNotification[]> {
    const where: any = { userId };
    if (options?.unreadOnly) where.read = false;
    const entities = await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: ((options?.page ?? 1) - 1) * (options?.limit ?? 20),
      take: options?.limit ?? 20,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, read: false } as any });
  }

  async markAsRead(id: string): Promise<InAppNotification | null> {
    const entity = await this.repository.findOne({ where: { id } as any });
    if (!entity) return null;
    entity.read = true;
    entity.readAt = new Date();
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repository.update(
      { userId, read: false } as any,
      { read: true, readAt: new Date() },
    );
    return result.affected ?? 0;
  }
}
