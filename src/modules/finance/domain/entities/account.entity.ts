import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

export class Account extends BaseEntity {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxCategory?: string;
  segment?: string;
  costCenter?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    props: Partial<Account> & { code: string; name: string; type: AccountType },
  ) {
    super();
    Object.assign(this, props);
    this.isActive = props.isActive ?? true;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
