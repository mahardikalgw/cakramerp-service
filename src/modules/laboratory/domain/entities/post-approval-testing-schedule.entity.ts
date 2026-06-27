import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type PostApprovalScheduleStatus =
  'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export class PostApprovalTestingSchedule extends BaseEntity {
  declare id: string;
  declare contractId: string;
  declare createdBy: string;
  declare createdByName: string;
  declare scheduledDate: string;
  declare scheduledTime: string | null;
  declare scheduledLocation: string | null;
  declare qtySamples: number;
  declare notes: string | null;
  declare laboranId: string | null;
  declare laboranName: string | null;
  declare status: PostApprovalScheduleStatus;
  declare confirmedBy: string | null;
  declare confirmedByName: string | null;
  declare confirmedAt: Date | null;
  declare statusNotes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<PostApprovalTestingSchedule> & {
      contractId: string;
      createdBy: string;
      createdByName: string;
      scheduledDate: string;
      qtySamples: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
