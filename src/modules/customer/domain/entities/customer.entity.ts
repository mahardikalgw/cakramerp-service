import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Customer extends BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  contactPerson: string;
  taxId: string;
  notes: string;
  status: 'active' | 'inactive';

  constructor(props: Partial<Customer> & { name: string }) {
    super();
    Object.assign(this, props);
  }
}
