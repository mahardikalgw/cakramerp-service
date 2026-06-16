import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class RefreshToken extends BaseEntity {
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare ipAddress?: string;
  declare userAgent?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<RefreshToken> & {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
  ) {
    super();
    Object.assign(this, props);
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isSessionValid(ipAddress?: string, userAgent?: string): boolean {
    if (this.ipAddress && ipAddress && this.ipAddress !== ipAddress) {
      return false;
    }
    if (this.userAgent && userAgent && this.userAgent !== userAgent) {
      return false;
    }
    return true;
  }
}
