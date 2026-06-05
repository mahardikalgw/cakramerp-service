import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Laboratory extends BaseEntity {
  declare id: string;
  declare name: string;
  declare location: string | null;
  declare capacity: number | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(props: Partial<Laboratory> & { name: string }) {
    super();
    Object.assign(this, props);
  }
}
