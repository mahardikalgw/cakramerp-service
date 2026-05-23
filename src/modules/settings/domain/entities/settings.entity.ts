import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Settings extends BaseEntity {
  id: string;
  key: string;
  value: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: Partial<Settings> & { key: string }) {
    super();
    Object.assign(this, props);
    this.category = props.category ?? null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
