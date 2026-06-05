import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Settings extends BaseEntity {
  declare id: string;
  declare key: string;
  declare value: string;
  declare category: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(props: Partial<Settings> & { key: string }) {
    super();
    Object.assign(this, props);
    this.category = props.category ?? null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
