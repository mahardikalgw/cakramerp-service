import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('refresh_tokens')
export class RefreshTokenTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 255, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;
}
