import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class TestingParameter extends BaseEntity {
  declare id: string;
  declare testingServiceId: string;
  declare name: string;
  declare standard: string | null;
  declare unit: string | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingParameter> & {
      testingServiceId: string;
      name: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
