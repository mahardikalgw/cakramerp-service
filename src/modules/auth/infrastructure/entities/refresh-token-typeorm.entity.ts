import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('refresh_tokens')
export class RefreshTokenTypeOrmEntity extends TypeOrmBaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  declare userId: string;

  @Index()
  @Column({ type: 'varchar', length: 255, name: 'token_hash' })
  declare tokenHash: string;

  @Index('IDX_refresh_tokens_expires_at')
  @Column({ type: 'timestamptz', name: 'expires_at' })
  declare expiresAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  declare ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  declare userAgent?: string;
}
