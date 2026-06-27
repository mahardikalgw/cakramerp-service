import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('notifications')
@Index('idx_notifications_recipient', ['recipientUserId'])
@Index('idx_notifications_unread', ['recipientUserId', 'isRead'], {
  where: 'is_read = false',
})
@Index('idx_notifications_created_at', ['createdAt'])
@Index('idx_notifications_entity', ['entityType', 'entityId'])
export class NotificationTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'recipient_user_id' })
  declare recipientUserId: string;

  @Column({ type: 'varchar', length: 60, name: 'event_type' })
  declare eventType: string;

  @Column({ type: 'varchar', length: 255 })
  declare title: string;

  @Column({ type: 'text' })
  declare message: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'action_url' })
  declare actionUrl: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'action_label',
  })
  declare actionLabel: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true, name: 'entity_type' })
  declare entityType: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'entity_id' })
  declare entityId: string | null;

  @Column({ type: 'boolean', default: false, name: 'email_sent' })
  declare emailSent: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'email_sent_at' })
  declare emailSentAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'push_sent' })
  declare pushSent: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'push_sent_at' })
  declare pushSentAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'push_error' })
  declare pushError: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  declare isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  declare readAt: Date | null;
}
