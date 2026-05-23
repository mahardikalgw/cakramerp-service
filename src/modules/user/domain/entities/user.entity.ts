import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export class User extends BaseEntity {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles?: string[];
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;

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
