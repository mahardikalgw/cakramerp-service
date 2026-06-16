import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('email_delivery_log')
@Index('idx_email_log_notification', ['notificationId'])
export class EmailDeliveryLogTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', nullable: true, name: 'notification_id' })
  declare notificationId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'recipient_email' })
  declare recipientEmail: string;

  @Column({ type: 'varchar', length: 500 })
  declare subject: string;

  @Column({ type: 'varchar', length: 50, default: 'resend' })
  declare provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_message_id' })
  declare providerMessageId: string | null;

  @Column({ type: 'varchar', length: 50 })
  declare status: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  declare errorMessage: string | null;
}
