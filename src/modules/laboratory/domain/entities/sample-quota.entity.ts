import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class SampleQuota extends BaseEntity {
  declare id: string;
  declare testingRequestId: string;
  declare testingServiceId: string;
  declare testingServiceName: string;
  declare customerId: string;
  declare totalQuota: number;
  declare usedQuota: number;
  declare remainingQuota: number;
  declare grantedAt: Date;
  declare grantedBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<SampleQuota> & {
      testingRequestId: string;
      testingServiceId: string;
      testingServiceName: string;
      customerId: string;
      totalQuota: number;
      grantedBy: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
