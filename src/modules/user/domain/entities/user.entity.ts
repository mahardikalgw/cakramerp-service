import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export class User extends BaseEntity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare firstName: string;
  declare lastName: string;
  declare status: UserStatus;
  declare roles?: string[];
  declare permissions?: string[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(props: Partial<User> & { email: string; passwordHash: string }) {
    super();
    Object.assign(this, props);
    this.status = props.status ?? UserStatus.ACTIVE;
  }

  get fullName(): string {
    return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  }

  deactivate(): void {
    this.status = UserStatus.INACTIVE;
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
  }
}
