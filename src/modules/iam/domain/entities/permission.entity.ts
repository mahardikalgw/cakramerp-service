import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Permission extends BaseEntity {
  id: string;
  name: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: Partial<Permission> & { name: string; resource: string; action: string }) {
    super();
    Object.assign(this, props);
  }
}
