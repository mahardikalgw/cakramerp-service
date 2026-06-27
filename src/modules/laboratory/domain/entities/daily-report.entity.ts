import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type DailyReportStatus =
  'draft' | 'submitted' | 'approved' | 'revision_requested';

export class DailyReportLine extends BaseEntity {
  declare id: string;
  declare dailyReportId: string;
  declare testResultId: string;
  declare resultNumber: string;
  declare sampleCode: string;
  declare serviceName: string;
  declare parameter: string;
  declare resultValue: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<DailyReportLine> & {
      dailyReportId: string;
      testResultId: string;
      resultNumber: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class DailyReport extends BaseEntity {
  declare id: string;
  declare reportNumber: string;
  declare reportDate: Date | string;
  declare testingRequestId: string;
  declare testingRequestNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare status: DailyReportStatus;
  declare submittedAt: Date | null;
  declare approvedById: string | null;
  declare approvedAt: Date | null;
  declare rejectionReason: string | null;
  declare lines: DailyReportLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<DailyReport> & {
      reportNumber: string;
      reportDate: Date | string;
      testingRequestId: string;
      testingRequestNumber: string;
      customerId: string;
      customerName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
