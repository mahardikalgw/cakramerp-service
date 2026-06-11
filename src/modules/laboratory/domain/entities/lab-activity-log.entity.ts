import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type LabActivityAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'cancelled'
  | 'sample_received'
  | 'sample_processing'
  | 'sample_completed'
  | 'result_submitted'
  | 'result_approved'
  | 'report_generated'
  | 'report_submitted'
  | 'report_approved'
  | 'report_revision_requested'
  | 'completed';

export class LabActivityLog extends BaseEntity {
  declare id: string;
  declare testingRequestId: string;
  declare action: LabActivityAction | string;
  declare performedBy: string;
  declare performedByName?: string;
  declare performedByRole?: string;
  declare details?: Record<string, unknown>;
  declare createdAt: Date;
  // updatedAt is required by BaseEntity but activity logs are immutable.
  // We set it equal to createdAt on construction.
  declare updatedAt: Date;

  constructor(
    props: Partial<LabActivityLog> & {
      testingRequestId: string;
      action: string;
      performedBy: string;
    },
  ) {
    super();
    Object.assign(this, props);
    // Ensure updatedAt is always set
    if (!this.updatedAt) this.updatedAt = this.createdAt;
  }
}
