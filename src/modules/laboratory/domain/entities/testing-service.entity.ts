import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class TestingService extends BaseEntity {
  declare id: string;
  declare code: string;
  declare name: string;
  declare unitPrice: number;
  declare measurementUnit: string | null;
  declare description: string | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingService> & {
      code: string;
      name: string;
      unitPrice: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
