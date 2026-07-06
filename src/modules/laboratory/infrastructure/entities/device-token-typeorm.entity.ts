import { Entity, Column, Index } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('device_tokens')
@Index('idx_device_tokens_user', ['userId'])
@Index('idx_device_tokens_active', ['userId', 'isActive'], {
  where: 'is_active = true',
})
@Index('idx_device_tokens_token', ['token'], { unique: true })
export class DeviceTokenTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  declare userId: string;

  @Column({ type: 'varchar', length: 20 })
  declare platform: string;

  @Column({ type: 'text' })
  declare token: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_name' })
  declare deviceName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'app_version' })
  declare appVersion: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'os_version' })
  declare osVersion: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  declare isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'invalidated_at' })
  declare invalidatedAt: Date | null;
}
