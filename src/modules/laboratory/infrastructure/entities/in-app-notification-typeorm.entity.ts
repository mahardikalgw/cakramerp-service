import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('in_app_notifications')
export class InAppNotificationTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare userId: string;

  @Column({ type: 'varchar', length: 50 })
  declare type: string;

  @Column({ type: 'varchar', length: 255 })
  declare title: string;

  @Column({ type: 'text' })
  declare message: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare entityType: string;

  @Column({ type: 'uuid', nullable: true })
  declare entityId: string;

  @Column({ type: 'boolean', default: false })
  declare read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  declare readAt: Date;
}
