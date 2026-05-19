import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class RefreshToken extends BaseEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: Partial<RefreshToken> & { userId: string; tokenHash: string; expiresAt: Date }) {
    super();
    Object.assign(this, props);
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
