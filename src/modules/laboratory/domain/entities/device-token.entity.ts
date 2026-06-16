import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class DeviceToken extends BaseEntity {
  declare id: string;
  declare userId: string;
  declare platform: 'ios' | 'android';
  declare token: string;
  declare deviceName: string | null;
  declare appVersion: string | null;
  declare osVersion: string | null;
  declare isActive: boolean;
  declare invalidatedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<DeviceToken> & {
      userId: string;
      platform: 'ios' | 'android';
      token: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
