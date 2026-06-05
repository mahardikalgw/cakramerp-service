import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class Permission extends BaseEntity {
  declare id: string;
  declare name: string;
  declare resource: string;
  declare action: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<Permission> & {
      name: string;
      resource: string;
      action: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
