import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type TestResultStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'revision_requested';

export class TestResultAttachment extends BaseEntity {
  declare id: string;
  declare testResultId: string;
  declare fileName: string;
  declare fileUrl: string;
  declare fileType: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestResultAttachment> & {
      testResultId: string;
      fileName: string;
      fileUrl: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class TestResult extends BaseEntity {
  declare id: string;
  declare resultNumber: string;
  declare sampleId: string;
  declare sampleCode: string;
  declare testingServiceId: string;
  declare serviceName: string;
  declare testingRequestId: string | null;
  declare parameter: string;
  declare resultValue: string;
  declare unit: string | null;
  declare laboratoryNotes: string | null;
  declare testedById: string | null;
  declare testedByName: string | null;
  declare testedAt: Date | null;
  declare approvedById: string | null;
  declare approvedAt: Date | null;
  declare status: TestResultStatus;
  declare attachments: TestResultAttachment[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestResult> & {
      resultNumber: string;
      sampleId: string;
      sampleCode: string;
      testingServiceId: string;
      serviceName: string;
      parameter: string;
      resultValue: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
