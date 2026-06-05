import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type TestingRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected';

export class TestingRequestLine extends BaseEntity {
  declare id: string;
  declare testingRequestId: string;
  declare testingServiceId: string;
  declare serviceName: string;
  declare sampleQuantity: number;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingRequestLine> & {
      testingRequestId: string;
      testingServiceId: string;
      serviceName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class TestingRequest extends BaseEntity {
  declare id: string;
  declare requestNumber: string;
  declare customerId: string;
  declare customerName?: string;
  declare projectName: string;
  declare projectLocation: string | null;
  declare testingType: string | null;
  declare sampleQuantity: number;
  declare scheduleDate: Date | string | null;
  declare notes: string | null;
  declare status: TestingRequestStatus;
  declare createdBy?: string;
  declare approvedBy?: string;
  declare approvedAt?: Date;
  declare rejectionReason?: string;
  declare lines: TestingRequestLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingRequest> & {
      requestNumber: string;
      customerId: string;
      projectName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
