import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Customer extends BaseEntity {
  declare id: string;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare address: string;
  declare city: string;
  declare contactPerson: string;
  declare taxId: string;
  declare notes: string;
  declare status: 'active' | 'inactive';
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(props: Partial<Customer> & { name: string }) {
    super();
    Object.assign(this, props);
  }
}
