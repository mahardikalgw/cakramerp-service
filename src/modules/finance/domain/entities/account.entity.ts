import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type AccountType =
  'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export class Account extends BaseEntity {
  declare id: string;
  declare code: string;
  declare name: string;
  declare type: AccountType;
  declare taxCategory?: string;
  declare segment?: string;
  declare costCenter?: string;
  declare parentId?: string;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

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
