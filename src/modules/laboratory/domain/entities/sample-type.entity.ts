import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class SampleType extends BaseEntity {
  declare id: string;
  declare code: string;
  declare name: string;
  declare description: string | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(props: Partial<SampleType> & { code: string; name: string }) {
    super();
    Object.assign(this, props);
  }
}
